import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { uploadReceipt, scanReceipt } from '../../api/receipts'
import { createBillSplit, updateBillSplit, listBillSplits, deleteBillSplit } from '../../api/billSplits'
import { listContacts, listGroups } from '../../api/contacts'
import { getFriends } from '../../api/friends'
import { getMe } from '../../api/auth'
import type { BillSplitResponse } from '../../api/billSplits'
import type { Contact, ContactGroup } from '../../api/contacts'
import { avatarColor } from '../../utils/avatar'
import { IconPencil, IconTrash, iconBtnEdit, iconBtnDelete } from '../../utils/icons'

// ─── Types ────────────────────────────────────────────────────────────────────

type Person = { id: string; name: string; friendId?: string }
type FriendRelationship = {
  friend: { id: string; display_name: string; email: string }
}
type ContactGroupView = ContactGroup & { memberIds: string[] }
type MeUser = { id: string; display_name: string }
type PersonSuggestion = Contact & { isMe: boolean }

type ItemState = {
  id: string
  name: string
  quantity: number
  unitPrice: number
  discountAmount: number
  isTaxable: boolean
  taxRate: number
  assignedTo: string[]
  isTaxLine: boolean
  isTipLine: boolean
}

type ReceiptState = {
  id: string
  backendReceiptId?: string   // the real DB receipt UUID after scanning
  merchantName: string
  date: string                // YYYY-MM-DD
  paidById: string
  items: ItemState[]
  scanning: boolean
  error: string
  ocr_total?: number
  isManual?: boolean
}

type Step = 'people' | 'receipts' | 'review' | 'summary'

const DEFAULT_TAX = 8.25

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 10) }

function itemTotal(item: ItemState): number {
  const base = item.unitPrice * item.quantity
  const afterDiscount = Math.max(0, base - (item.discountAmount || 0))
  const tax = item.isTaxable ? afterDiscount * (item.taxRate / 100) : 0
  return afterDiscount + tax
}


// Tax portion covered by per-item checkboxes
function perItemTaxCovered(r: ReceiptState): number {
  return r.items
    .filter(i => !i.isTaxLine && i.isTaxable)
    .reduce((s, i) => {
      const base = i.unitPrice * i.quantity
      const afterDiscount = Math.max(0, base - (i.discountAmount || 0))
      return s + afterDiscount * (i.taxRate / 100)
    }, 0)
}

// Effective TAX line amount = original tax - already covered by checkboxes
function effectiveTaxLineAmount(r: ReceiptState, item: ItemState): number {
  if (!item.isTaxLine) return itemTotal(item)
  const original = item.unitPrice * item.quantity
  const covered = perItemTaxCovered(r)
  return Math.max(0, original - covered)
}

// Items subtotal (non-tax-line items, including any per-item tax added via checkbox)
function itemsSubtotal(r: ReceiptState): number {
  return r.items.filter(i => !i.isTaxLine && !i.isTipLine).reduce((s, i) => s + itemTotal(i), 0)
}

// Effective tax total (tax lines after subtracting per-item coverage)
function effectiveTaxTotal(r: ReceiptState): number {
  return r.items.filter(i => i.isTaxLine).reduce((s, i) => s + effectiveTaxLineAmount(r, i), 0)
}

// Tip total
function tipTotal(r: ReceiptState): number {
  return r.items.filter(i => i.isTipLine).reduce((s, i) => s + itemTotal(i), 0)
}

// Total tax embedded in per-item taxable amounts (for display only)
function embeddedTaxTotal(r: ReceiptState): number {
  return r.items
    .filter(i => !i.isTaxLine && !i.isTipLine && i.isTaxable)
    .reduce((s, i) => {
      const base = Math.max(0, i.unitPrice * i.quantity - (i.discountAmount || 0))
      return s + base * (i.taxRate / 100)
    }, 0)
}

// Grand effective total = items + effective tax + tips
function receiptEffectiveTotal(r: ReceiptState): number {
  return itemsSubtotal(r) + effectiveTaxTotal(r) + tipTotal(r)
}

function receiptItemsTotal(r: ReceiptState) {
  return receiptEffectiveTotal(r)
}

function isTallied(r: ReceiptState) {
  if (!r.ocr_total) return true
  return Math.abs(receiptEffectiveTotal(r) - r.ocr_total) < 0.02
}

function hasDoubleTax(_r: ReceiptState) { return false }

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BillSplitPage() {
  const [step, setStep] = useState<Step>('people')
  const [people, setPeople] = useState<Person[]>([])
  const [nameInput, setNameInput] = useState('')
  const [receipts, setReceipts] = useState<ReceiptState[]>([])
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [savedSplitId, setSavedSplitId] = useState<string | null>(null)
  const [showSavedSplits, setShowSavedSplits] = useState(false)
  const [manualInputs, setManualInputs] = useState<Record<string, { name: string; price: string }>>({})
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: listContacts,
  })
  const { data: contactGroupsRaw = [] } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: listGroups,
  })
  const { data: friends = [] } = useQuery({
    queryKey: ['friends'],
    queryFn: getFriends,
  })
  const { data: me = null } = useQuery<MeUser | null>({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  })
  const contactGroups: ContactGroupView[] = contactGroupsRaw.map((g: ContactGroup) => ({ ...g, memberIds: g.member_ids || [] }))
  const friendContacts: Contact[] = friends.map((f: FriendRelationship) => ({
    id: f.friend.id,
    name: f.friend.display_name,
    note: f.friend.email,
  }))
  const [showDropdown, setShowDropdown] = useState(false)

  // ── Saved splits ────────────────────────────────────────────────────────────
  const savedSplitsQuery = useQuery({
    queryKey: ['bill-splits'],
    queryFn: listBillSplits,
  })

  const buildSplitState = () => ({
    people,
    receipts: receipts.map(r => ({
      id: r.id,
      backendReceiptId: r.backendReceiptId,
      merchantName: r.merchantName,
      paidById: r.paidById,
      ocr_total: r.ocr_total,
      items: r.items,
    })),
  })

  const loadSplit = (saved: BillSplitResponse) => {
    const s = saved.state as any
    setPeople(s.people || [])
    setReceipts((s.receipts || []).map((r: any) => ({
      ...r,
      date: r.date || new Date().toISOString().split('T')[0],
      scanning: false,
      error: '',
    })))
    setSavedSplitId(saved.id)
    setStep('summary')
    setShowSavedSplits(false)
  }

  const saveSplit = useMutation({
    mutationFn: async () => {
      const merchantNames = receipts.map(r => r.merchantName || 'Receipt').filter(Boolean)
      const title = merchantNames.length ? merchantNames.join(', ') : 'Bill Split'
      const state = buildSplitState()
      if (savedSplitId) {
        return updateBillSplit(savedSplitId, title, state)
      } else {
        return createBillSplit(title, state)
      }
    },
    onSuccess: (data) => {
      setSavedSplitId(data.id)
      queryClient.invalidateQueries({ queryKey: ['bill-splits'] })
    },
  })

  const deleteSplit = useMutation({
    mutationFn: (id: string) => deleteBillSplit(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bill-splits'] }),
  })

  // Auto-load from ?load=id URL param (coming from Activity page)
  useEffect(() => {
    const loadId = searchParams.get('load')
    if (!loadId || !savedSplitsQuery.data) return
    const found = savedSplitsQuery.data.find(s => s.id === loadId)
    if (found) {
      loadSplit(found)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, savedSplitsQuery.data])

  // Listen for "New split" event dispatched from sidebar
  useEffect(() => {
    const handler = () => {
      setPeople([]); setReceipts([])
      setSavedSplitId(null); setStep('people'); saveSplit.reset()
    }
    window.addEventListener('splitit:new-split', handler)
    return () => window.removeEventListener('splitit:new-split', handler)
  }, [])

  // ── People helpers ──────────────────────────────────────────────────────────
  const addPerson = (name: string, contactId?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    // Dedupe by contactId if provided, otherwise by name
    if (contactId && people.find(p => p.id === contactId)) return
    if (!contactId && people.find(p => p.name.toLowerCase() === trimmed.toLowerCase())) return
    setPeople(prev => [...prev, { id: contactId || genId(), name: trimmed, friendId: contactId }])
    setNameInput('')
  }

  // Contacts not yet added as people
  // "You" suggestion — the logged-in user shown at top of dropdown
  const meSuggestion = me && !people.find(p => p.id === me.id) &&
    (nameInput.trim() === '' || me.display_name.toLowerCase().includes(nameInput.toLowerCase()))
    ? [{ id: me.id, name: me.display_name, isMe: true }]
    : []

  const contactSuggestions: PersonSuggestion[] = [
    ...meSuggestion,
    ...contacts.filter(c =>
      !people.find(p => p.id === c.id) &&
      (nameInput.trim() === '' || c.name.toLowerCase().includes(nameInput.toLowerCase()))
    ).map(c => ({ ...c, isMe: false })),
    ...friendContacts.filter((c: Contact) =>
      !people.find(p => p.id === c.id) &&
      !contacts.find(x => x.id === c.id) &&
      (nameInput.trim() === '' || c.name.toLowerCase().includes(nameInput.toLowerCase()))
    ).map((c: Contact) => ({ ...c, isMe: false })),
  ]

  // ── Receipt helpers ─────────────────────────────────────────────────────────
  const updateItem = (rId: string, itemId: string, changes: Partial<ItemState>) =>
    setReceipts(prev => prev.map(r =>
      r.id !== rId ? r : { ...r, items: r.items.map(i => i.id === itemId ? { ...i, ...changes } : i) }
    ))

  const togglePerson = (rId: string, itemId: string, personId: string) =>
    setReceipts(prev => prev.map(r => {
      if (r.id !== rId) return r
      return {
        ...r,
        items: r.items.map(i => {
          if (i.id !== itemId) return i
          const has = i.assignedTo.includes(personId)
          return { ...i, assignedTo: has ? i.assignedTo.filter(x => x !== personId) : [...i.assignedTo, personId] }
        })
      }
    }))

  const handleFile = async (file: File, rId: string) => {
    setReceipts(prev => prev.map(r => r.id === rId ? { ...r, scanning: true, error: '' } : r))
    try {
      const uploaded = await uploadReceipt(file)
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Scan timed out — try again or enter manually')), 90_000)
      )
      const scanned = await Promise.race([scanReceipt(uploaded.id), timeout])
      setReceipts(prev => prev.map(r => {
        if (r.id !== rId) return r
        return {
          ...r,
          scanning: false,
          backendReceiptId: scanned.id,
          merchantName: scanned.merchant_name || 'Receipt',
          date: r.date || today(),
          ocr_total: scanned.ocr_total ?? undefined,
          items: (scanned.items as any[]).map(item => ({
            id: item.id,
            name: item.name,
            quantity: parseFloat(item.quantity) || 1,
            unitPrice: parseFloat(item.unit_price) || 0,
            discountAmount: parseFloat(item.discount_amount) || 0,
            isTaxable: item.is_taxable || false,
            taxRate: parseFloat(item.tax_rate) || 0,
            assignedTo: item.is_tip_line ? people.map(p => p.id) : [],
            isTaxLine: false,  // tax is now distributed per-item, no separate line
            isTipLine: item.is_tip_line || false,
          }))
        }
      }))
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Scan failed — try again'
      setReceipts(prev => prev.map(r => r.id === rId ? { ...r, scanning: false, error: msg } : r))
    }
  }

  const today = () => new Date().toISOString().split('T')[0]

  // Start scanning multiple files in parallel — creates one receipt slot per file
  const handleFiles = (files: File[]) => {
    if (!files.length) return
    const slots = files.map(() => ({ id: genId() }))
    setReceipts(prev => [
      ...prev,
      ...slots.map(({ id }) => ({
        id,
        merchantName: '',
        date: today(),
        paidById: people[0]?.id || '',
        items: [],
        scanning: true,
        error: '',
      }))
    ])
    slots.forEach(({ id }, i) => handleFile(files[i], id))
  }

  const addManualReceipt = () => {
    const id = genId()
    setReceipts(prev => [...prev, {
      id, merchantName: '', date: today(), paidById: people[0]?.id || '',
      items: [], scanning: false, error: '', isManual: true,
    }])
    setManualInputs(prev => ({ ...prev, [id]: { name: '', price: '' } }))
  }

  const addManualItem = (rId: string) => {
    const input = manualInputs[rId]
    if (!input?.name.trim() || !input?.price) return
    const price = parseFloat(input.price)
    if (isNaN(price) || price <= 0) return
    const itemId = genId()
    setReceipts(prev => prev.map(r => r.id !== rId ? r : {
      ...r,
      items: [...r.items, {
        id: itemId,
        name: input.name.trim(),
        quantity: 1,
        unitPrice: price,
        discountAmount: 0,
        isTaxable: false,
        taxRate: DEFAULT_TAX,
        assignedTo: [],
        isTaxLine: false,
        isTipLine: false,
      }]
    }))
    setManualInputs(prev => ({ ...prev, [rId]: { name: '', price: '' } }))
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const summary = people.map(person => {
    let share = 0
    let paid = 0
    for (const r of receipts) {
      const rTotal = receiptEffectiveTotal(r)
      if (r.paidById === person.id) paid += rTotal
      for (const item of r.items) {
        if (!item.assignedTo.includes(person.id) || item.assignedTo.length === 0) continue
        // Use effective amount for tax lines (remaining after per-item coverage)
        const amt = item.isTaxLine ? effectiveTaxLineAmount(r, item) : itemTotal(item)
        share += amt / item.assignedTo.length
      }
    }
    return { person, share, paid, net: share - paid }
  })

  const settlements = (() => {
    const debtors = summary.filter(s => s.net > 0.01).map(s => ({ ...s })).sort((a, b) => b.net - a.net)
    const creditors = summary.filter(s => s.net < -0.01).map(s => ({ ...s })).sort((a, b) => a.net - b.net)
    const result: { from: string; to: string; amount: number }[] = []
    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].net, -creditors[j].net)
      if (amount > 0.01) result.push({ from: debtors[i].person.name, to: creditors[j].person.name, amount })
      debtors[i].net -= amount
      creditors[j].net += amount
      if (debtors[i].net < 0.01) i++
      if (creditors[j].net > -0.01) j++
    }
    return result
  })()

  const grandTotal = receipts.reduce((s, r) => s + receiptEffectiveTotal(r), 0)
  const chatSummaryText = (() => {
    const lines: string[] = []
    const title = receipts.length === 1
      ? (receipts[0].merchantName || 'Split')
      : `${receipts.length} receipts`

    lines.push(`${title} • Total $${grandTotal.toFixed(2)}`)
    lines.push('')
    lines.push('Paid:')
    summary
      .filter(s => s.paid > 0.01)
      .forEach(s => lines.push(`- ${s.person.name} paid $${s.paid.toFixed(2)}`))

    lines.push('')
    lines.push('Items by group:')
    const groupedItems = new Map<string, { label: string; rows: string[] }>()
    const allIds = new Set(people.map(p => p.id))
    const joinNames = (names: string[]) => {
      if (names.length <= 1) return names[0] || ''
      if (names.length === 2) return `${names[0]} and ${names[1]}`
      return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    }

    receipts.forEach((r) => {
      const splitItems = r.items.filter(i => !i.isTaxLine && !i.isTipLine)
      splitItems.forEach(item => {
        const assigned = item.assignedTo
          .map(id => people.find(p => p.id === id))
          .filter(Boolean) as Person[]
        if (assigned.length === 0) return

        const sortedAssigned = [...assigned].sort((a, b) => a.name.localeCompare(b.name))
        const key = sortedAssigned.map(p => p.id).join('|')
        const isAll = sortedAssigned.length === allIds.size && sortedAssigned.every(p => allIds.has(p.id))
        const label = isAll ? 'All' : joinNames(sortedAssigned.map(p => p.name))
        const row = `${item.name} - $${itemTotal(item).toFixed(2)}`

        if (!groupedItems.has(key)) groupedItems.set(key, { label, rows: [] })
        groupedItems.get(key)!.rows.push(row)
      })
    })

    if (groupedItems.size === 0) {
      lines.push('- No assigned items')
    } else {
      for (const group of groupedItems.values()) {
        lines.push('')
        lines.push(group.label)
        group.rows.forEach(row => lines.push(`- ${row}`))
      }
    }

    lines.push('')
    lines.push('Settle:')
    if (settlements.length === 0) {
      lines.push('- All settled ✅')
    } else {
      settlements.forEach(s => lines.push(`- ${s.from} owes ${s.to} $${s.amount.toFixed(2)}`))
    }

    return lines.join('\n')
  })()

  const copyChatSummary = async () => {
    try {
      await navigator.clipboard.writeText(chatSummaryText)
      setCopyState('done')
      setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      try {
        const el = document.createElement('textarea')
        el.value = chatSummaryText
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        setCopyState('done')
        setTimeout(() => setCopyState('idle'), 1800)
      } catch {
        setCopyState('error')
        setTimeout(() => setCopyState('idle'), 1800)
      }
    }
  }

  const STEPS: Step[] = ['people', 'receipts', 'review', 'summary']
  const stepIdx = STEPS.indexOf(step)

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-card-border)] px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--color-apple-text)] tracking-tight">Bill Calculator</h1>
            {savedSplitId && (
              <span className="text-xs bg-[var(--color-apple-green-bg)] border border-[var(--color-apple-green)]/30 text-[var(--color-apple-success-text)] px-2.5 py-1 rounded-full font-medium">
                ✓ Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  i < stepIdx ? 'bg-[var(--color-apple-green)] text-white' :
                  i === stepIdx ? 'bg-[var(--color-apple-blue)] text-white' :
                  'bg-[var(--color-divider)] text-[var(--color-apple-tertiary)]'
                }`}>{i < stepIdx ? '✓' : i + 1}</div>
                {i < 3 && <div className="w-5 h-px bg-[var(--color-apple-border)]" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PEOPLE QUICK-EDIT BAR (shown on steps after 'people') ─────────── */}
      {step !== 'people' && (
        <div className="border-b border-[var(--color-card-border)] bg-[var(--color-apple-sidebar)]">
          <div className="max-w-3xl mx-auto px-8">
            <button
              onClick={() => setPeopleOpen(o => !o)}
              className="flex items-center gap-2 py-3 text-sm text-[var(--color-chip-text)] hover:text-[var(--color-apple-text)] w-full text-left"
            >
              <div className="flex -space-x-1.5">
                {people.slice(0, 5).map(p => (
                  <div key={p.id} className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold border border-white" style={{ background: avatarColor(p.name).bg, color: avatarColor(p.name).text }}>
                    {p.name[0].toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="font-medium">{people.length} {people.length === 1 ? 'person' : 'people'}</span>
              <span className="text-[var(--color-apple-tertiary)]">· tap to edit</span>
              <span className="ml-auto text-[var(--color-apple-tertiary)]">{peopleOpen ? '▲' : '▼'}</span>
            </button>

            {peopleOpen && (
              <div className="pb-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {people.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white" style={{ background: avatarColor(p.name).bg, color: avatarColor(p.name).text }}>
                      {p.name}
                      <button
                        onClick={() => setPeople(prev => prev.filter(x => x.id !== p.id))}
                        className="opacity-70 hover:opacity-100 ml-0.5 leading-none"
                      >✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={quickName}
                    onChange={e => setQuickName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { addPerson(quickName); setQuickName('') } }}
                    placeholder="Add a person..."
                    className="flex-1 border border-[var(--color-apple-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-apple-blue)] bg-white"
                  />
                  <button
                    onClick={() => { addPerson(quickName); setQuickName('') }}
                    disabled={!quickName.trim()}
                    className="bg-[var(--color-apple-blue)] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[var(--color-apple-blue-hover)] transition-colors"
                  >Add</button>
                </div>
                {(() => {
                  const quickSuggestions = [
                    ...(me && !people.find(p => p.id === me.id) ? [{ id: me.id, name: me.display_name, isMe: true }] : []),
                    ...contacts.filter(c => !people.find(p => p.id === c.id)).map(c => ({ ...c, isMe: false })),
                    ...friendContacts
                      .filter((c: Contact) => !people.find(p => p.id === c.id) && !contacts.find(x => x.id === c.id))
                      .map((c: Contact) => ({ ...c, isMe: false })),
                  ]
                  return quickSuggestions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {quickSuggestions.map(c => (
                        <button
                          key={c.id}
                          onClick={() => addPerson(c.name, c.id)}
                          className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-apple-border)] text-[var(--color-chip-text)] hover:border-[var(--color-apple-blue)] hover:text-[var(--color-apple-blue)] transition-colors"
                        >+ {c.name}{c.isMe ? ' (You)' : ''}</button>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-8 py-8 max-w-3xl mx-auto">

        {/* ── STEP 1: PEOPLE ───────────────────────────────────────────────── */}
        {step === 'people' && (
          <div className="space-y-4">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[var(--color-apple-text)] tracking-tight mb-1">Who's splitting?</h2>
              <p className="text-sm text-[var(--color-apple-secondary)]">Add everyone involved in this bill</p>
            </div>

            <div className="bg-white rounded-2xl border border-[var(--color-card-border)] p-5">
              {/* Name input with dropdown */}
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    value={nameInput}
                    onChange={e => { setNameInput(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { addPerson(nameInput); setShowDropdown(false) }
                      if (e.key === 'Escape') setShowDropdown(false)
                    }}
                    placeholder="Type a name..."
                    autoFocus
                    className="flex-1 border border-[var(--color-apple-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-apple-blue)] bg-[var(--color-apple-sidebar)]"
                  />
                  <button
                    onClick={() => { addPerson(nameInput); setShowDropdown(false) }}
                    disabled={!nameInput.trim()}
                    className="bg-[var(--color-apple-blue)] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[var(--color-apple-blue-hover)] transition-colors"
                  >Add</button>
                </div>

                {/* Contact dropdown — only when typing */}
                {showDropdown && nameInput.trim().length > 0 && contactSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-10 mt-1 bg-white border border-[var(--color-card-border)] rounded-xl shadow-lg z-20 overflow-hidden">
                    {contactSuggestions.slice(0, 6).map((c: PersonSuggestion) => (
                      <button
                        key={c.id}
                        onMouseDown={e => { e.preventDefault(); addPerson(c.name, c.id); setShowDropdown(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-apple-bg)] transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: avatarColor(c.name).bg, color: avatarColor(c.name).text }}>
                          {c.name[0].toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--color-apple-text)]">{c.name}</p>
                          {c.isMe && <span className="text-xs bg-[var(--color-apple-blue-light)] text-[var(--color-apple-blue)] px-2 py-0.5 rounded-full font-medium">You</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Group chips below input */}
              {contactGroups.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--color-divider)]">
                  <p className="text-xs text-[var(--color-caption)] mb-2">Groups</p>
                  <div className="flex flex-wrap gap-2">
                    {contactGroups.map(g => {
                      // Resolve members: check contacts first, then fall back to "me"
                      const members = g.memberIds.map((id: string) => {
                        if (me && id === me.id) return { id: me.id, name: me.display_name }
                        return contacts.find(c => c.id === id) || null
                      }).filter(Boolean) as { id: string; name: string }[]
                      const allAdded = members.length > 0 && members.every(m => people.find(p => p.id === m.id))
                      return (
                        <button
                          key={g.id}
                          onClick={() => {
                            if (allAdded) {
                              // Deselect — only remove members NOT in any other selected group
                              const otherGroups = contactGroups.filter(og => og.id !== g.id)
                              const otherGroupMemberIds = new Set(
                                otherGroups.flatMap(og =>
                                  og.memberIds.filter((_id: string) => {
                                    const ogMembers = og.memberIds.map((mid: string) => {
                                      if (me && mid === me.id) return { id: me.id, name: me.display_name }
                                      return contacts.find(c => c.id === mid) || null
                                    }).filter(Boolean) as any[]
                                    return ogMembers.length > 0 && ogMembers.every(m => people.find(p => p.id === m.id))
                                  })
                                )
                              )
                              setPeople(prev => prev.filter(p =>
                                !members.find(m => m.id === p.id) || otherGroupMemberIds.has(p.id)
                              ))
                            } else {
                              // Select — add all members
                              members.forEach(m => addPerson(m.name, m.id))
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                          style={{
                            borderColor: allAdded ? 'var(--color-apple-text)' : 'var(--color-apple-blue)',
                            color: allAdded ? 'var(--color-apple-card)' : 'var(--color-apple-blue)',
                            background: allAdded ? 'var(--color-apple-text)' : 'var(--color-apple-blue-tint-2)'
                          }}
                        >
                          {allAdded
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          }
                          {g.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {people.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--color-divider)]">
                  {people.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white" style={{ background: avatarColor(p.name).bg, color: avatarColor(p.name).text }}>
                      {p.name}
                      <button onClick={() => setPeople(prev => prev.filter(x => x.id !== p.id))} className="opacity-70 hover:opacity-100 ml-0.5">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {contacts.length === 0 && (
              <p className="text-xs text-[var(--color-caption)] text-center">
                Tip: Add contacts in the <a href="/contacts" className="text-[var(--color-apple-blue)]">Contacts</a> tab to quickly select people here.
              </p>
            )}

            <button
              onClick={() => setStep('receipts')}
              disabled={people.length < 1}
              className="w-full bg-[var(--color-apple-blue)] text-white py-3 rounded-2xl text-sm font-semibold disabled:opacity-40 hover:bg-[var(--color-apple-blue-hover)] transition-colors"
            >
              Continue with {people.length || 0} {people.length === 1 ? 'person' : 'people'} →
            </button>

            {/* Saved splits */}
            {(savedSplitsQuery.data?.length ?? 0) > 0 && (
              <div>
                <button
                  onClick={() => setShowSavedSplits(o => !o)}
                  className="w-full flex items-center justify-between text-xs text-[var(--color-apple-secondary)] py-2 hover:text-[var(--color-apple-text)] transition-colors"
                >
                  <span className="font-medium">Saved splits ({savedSplitsQuery.data!.length})</span>
                  <span>{showSavedSplits ? '▲' : '▼'}</span>
                </button>

                {showSavedSplits && (
                  <div className="bg-white rounded-2xl border border-[var(--color-card-border)] overflow-hidden divide-y divide-[var(--color-divider)]">
                    {savedSplitsQuery.data!.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-apple-sidebar)] transition-colors">
                        <button
                          onClick={() => loadSplit(s)}
                          className="flex-1 text-left"
                        >
                          <p className="text-sm font-medium text-[var(--color-apple-text)]">{s.title || 'Bill Split'}</p>
                          <p className="text-xs text-[var(--color-caption)] mt-0.5">
                            {new Date(s.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this saved split?')) {
                              deleteSplit.mutate(s.id)
                              if (savedSplitId === s.id) setSavedSplitId(null)
                            }
                          }}
                          className={iconBtnDelete}
                          title="Delete"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: RECEIPTS ─────────────────────────────────────────────── */}
        {step === 'receipts' && (
          <div className="space-y-4">
            <div className="mb-2">
              <h2 className="text-2xl font-semibold text-[var(--color-apple-text)] tracking-tight mb-1">Add receipts</h2>
              <p className="text-sm text-[var(--color-apple-secondary)]">Scan a receipt or enter items manually</p>
            </div>

            {/* Receipt cards (scanned + manual) */}
            {receipts.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-[var(--color-card-border)] p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <input
                      value={r.merchantName}
                      onChange={e => setReceipts(prev => prev.map(x => x.id === r.id ? { ...x, merchantName: e.target.value } : x))}
                      placeholder={r.isManual ? 'Bill name (e.g. Dinner)' : (r.scanning ? 'Scanning...' : 'Merchant')}
                      className="text-sm font-semibold text-[var(--color-apple-text)] w-full bg-transparent border-0 focus:outline-none focus:bg-[var(--color-apple-bg)] rounded px-1 -ml-1 py-0.5"
                    />
                    {!r.isManual && r.items.length > 0 && (
                      <p className="text-xs font-medium mt-0.5">
                        {r.ocr_total
                          ? isTallied(r)
                            ? <span className="text-[var(--color-apple-green)]">✓ {r.items.length} items · matches ${r.ocr_total.toFixed(2)}</span>
                            : <span className="text-[var(--color-apple-red)]">⚠ {r.items.length} items · ${receiptItemsTotal(r).toFixed(2)} vs ${r.ocr_total.toFixed(2)}</span>
                          : <span className="text-[var(--color-apple-green)]">✓ {r.items.length} items found</span>
                        }
                      </p>
                    )}
                    {r.isManual && r.items.length > 0 && (
                      <p className="text-xs text-[var(--color-apple-green)] font-medium mt-0.5">✓ {r.items.length} item{r.items.length !== 1 ? 's' : ''} · ${receiptEffectiveTotal(r).toFixed(2)}</p>
                    )}
                    {r.error && <p className="text-xs text-[var(--color-apple-red)] mt-0.5">{r.error}</p>}
                  </div>
                  <button onClick={() => setReceipts(prev => prev.filter(x => x.id !== r.id))} className={`${iconBtnDelete} shrink-0`} title="Remove receipt">
                    <IconTrash />
                  </button>
                </div>

                {r.scanning ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-apple-secondary)] py-2">
                    <div className="w-4 h-4 border-2 border-[var(--color-apple-blue)] border-t-transparent rounded-full animate-spin shrink-0" />
                    Reading receipt with AI...
                  </div>
                ) : r.isManual ? (
                  <div className="space-y-3">
                    {/* Existing items */}
                    {r.items.length > 0 && (
                      <div className="divide-y divide-[var(--color-divider)] border border-[var(--color-divider)] rounded-xl overflow-hidden">
                        {r.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between px-3 py-2">
                            <span className="text-sm text-[var(--color-apple-text)] flex-1 truncate">{item.name}</span>
                            <span className="text-sm font-medium text-[var(--color-apple-text)] ml-3">${item.unitPrice.toFixed(2)}</span>
                            <button
                              onClick={() => setReceipts(prev => prev.map(rx => rx.id !== r.id ? rx : { ...rx, items: rx.items.filter(i => i.id !== item.id) }))}
                              className="ml-2 text-[var(--color-caption)] hover:text-[var(--color-apple-red)] transition-colors text-xs"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Add item row */}
                    <div className="flex gap-2">
                      <input
                        value={manualInputs[r.id]?.name || ''}
                        onChange={e => setManualInputs(prev => ({ ...prev, [r.id]: { ...prev[r.id], name: e.target.value } }))}
                        onKeyDown={e => { if (e.key === 'Enter') addManualItem(r.id) }}
                        placeholder="Item name"
                        className="flex-1 border border-[var(--color-apple-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-apple-blue)] bg-[var(--color-apple-sidebar)]"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2.5 top-2.5 text-xs text-[var(--color-caption)]">$</span>
                        <input
                          type="number" min="0" step="0.01"
                          value={manualInputs[r.id]?.price || ''}
                          onChange={e => setManualInputs(prev => ({ ...prev, [r.id]: { ...prev[r.id], price: e.target.value } }))}
                          onKeyDown={e => { if (e.key === 'Enter') addManualItem(r.id) }}
                          placeholder="0.00"
                          className="w-full border border-[var(--color-apple-border)] rounded-xl pl-5 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-apple-blue)] bg-[var(--color-apple-sidebar)]"
                        />
                      </div>
                      <button
                        onClick={() => addManualItem(r.id)}
                        disabled={!manualInputs[r.id]?.name?.trim() || !manualInputs[r.id]?.price}
                        className="bg-[var(--color-apple-blue)] text-white px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[var(--color-apple-blue-hover)] transition-colors"
                      >Add</button>
                    </div>
                    {/* Paid by */}
                    <div>
                      <label className="text-xs text-[var(--color-apple-tertiary)] mb-1.5 block">Paid by</label>
                      <select
                        value={r.paidById}
                        onChange={e => setReceipts(prev => prev.map(x => x.id === r.id ? { ...x, paidById: e.target.value } : x))}
                        className="w-full border border-[var(--color-apple-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-apple-blue)] bg-[var(--color-apple-sidebar)]"
                      >
                        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-[var(--color-apple-tertiary)] mb-1.5 block">Paid by</label>
                    <select
                      value={r.paidById}
                      onChange={e => setReceipts(prev => prev.map(x => x.id === r.id ? { ...x, paidById: e.target.value } : x))}
                      className="w-full border border-[var(--color-apple-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-apple-blue)] bg-[var(--color-apple-sidebar)]"
                    >
                      {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ))}

            {/* Add options */}
            <div className="grid grid-cols-2 gap-3">
              {/* Scan receipt */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-white rounded-2xl border-2 border-dashed border-[var(--color-apple-border)] p-6 text-center cursor-pointer hover:border-[var(--color-apple-blue)] hover:bg-[var(--color-apple-blue-tint)] transition-colors"
              >
                <div className="w-9 h-9 bg-[var(--color-apple-blue-light)] rounded-xl flex items-center justify-center mx-auto mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-apple-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2"/>
                    <line x1="9" y1="7" x2="15" y2="7"/>
                    <line x1="9" y1="11" x2="15" y2="11"/>
                    <line x1="9" y1="15" x2="13" y2="15"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--color-apple-blue)]">Scan receipts</p>
                <p className="text-xs text-[var(--color-apple-tertiary)] mt-0.5">Select one or more photos</p>
              </div>

              {/* Enter manually */}
              <div
                onClick={addManualReceipt}
                className="bg-white rounded-2xl border-2 border-dashed border-[var(--color-apple-border)] p-6 text-center cursor-pointer hover:border-[var(--color-apple-green)] hover:bg-[var(--color-apple-green-tint)] transition-colors"
              >
                <div className="w-9 h-9 bg-[var(--color-apple-green-bg)] rounded-xl flex items-center justify-center mx-auto mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-apple-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--color-apple-green)]">Enter manually</p>
                <p className="text-xs text-[var(--color-apple-tertiary)] mt-0.5">Type items & prices</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif,.pdf,application/pdf"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || [])
                if (!files.length) return
                handleFiles(files)
                e.target.value = ''
              }}
            />

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep('people')} className="px-4 py-2.5 rounded-xl text-sm text-[var(--color-apple-secondary)] hover:bg-[var(--color-divider)] transition-colors">← Back</button>
              <button
                onClick={() => setStep('review')}
                disabled={receipts.length === 0 || receipts.some(r => r.scanning) || receipts.some(r => r.items.length === 0)}
                className="flex-1 bg-[var(--color-apple-blue)] text-white py-2.5 rounded-2xl text-sm font-semibold disabled:opacity-40 hover:bg-[var(--color-apple-blue-hover)] transition-colors"
              >
                Assign items →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: REVIEW ───────────────────────────────────────────────── */}
        {step === 'review' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--color-apple-text)] tracking-tight mb-1">Assign items</h2>
                <p className="text-sm text-[var(--color-apple-secondary)]">
                  {receipts.length > 1
                    ? `${receipts.length} receipts · tap names to assign, tap price to edit`
                    : 'Tap names to assign. Tap a price to edit it.'}
                </p>
              </div>
              <button onClick={() => setStep('summary')} className="bg-[var(--color-apple-blue)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--color-apple-blue-hover)] transition-colors">
                Summary →
              </button>
            </div>

            {/* Receipt jump pills (shown when 2+ receipts) */}
            {receipts.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {receipts.map((r, i) => (
                  <a
                    key={r.id}
                    href={`#receipt-${r.id}`}
                    className="text-xs px-3 py-1.5 rounded-full bg-white border border-[var(--color-card-border)] text-[var(--color-chip-text)] hover:border-[var(--color-apple-blue)] hover:text-[var(--color-apple-blue)] transition-colors font-medium"
                  >
                    {r.merchantName || `Receipt ${i + 1}`}
                    {r.items.filter(x => !x.isTaxLine && !x.isTipLine).length > 0
                      ? ` · ${r.items.filter(x => !x.isTaxLine && !x.isTipLine).length} items`
                      : ''}
                  </a>
                ))}
              </div>
            )}

            {receipts.map(r => (
              <div key={r.id} id={`receipt-${r.id}`} className="bg-white rounded-2xl border border-[var(--color-card-border)] overflow-hidden scroll-mt-4">
                {/* Receipt header */}
                <div className="px-5 py-4 bg-[var(--color-apple-sidebar)] border-b border-[var(--color-card-border)]">
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Editable name */}
                      <input
                        value={r.merchantName}
                        onChange={e => setReceipts(prev => prev.map(x => x.id === r.id ? { ...x, merchantName: e.target.value } : x))}
                        placeholder="Receipt name"
                        className="text-sm font-semibold text-[var(--color-apple-text)] w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--color-apple-blue)] rounded-lg px-1 -ml-1 py-0.5 transition-all"
                      />
                      {/* Paid by + Date row */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <select
                          value={r.paidById}
                          onChange={e => setReceipts(prev => prev.map(x => x.id === r.id ? { ...x, paidById: e.target.value } : x))}
                          className="text-xs text-[var(--color-apple-tertiary)] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-[var(--color-apple-blue)] rounded cursor-pointer -ml-0.5"
                        >
                          {people.map(p => <option key={p.id} value={p.id}>Paid by {p.name}</option>)}
                        </select>
                        <span className="text-[var(--color-apple-border)] text-xs">·</span>
                        <input
                          type="date"
                          value={r.date || ''}
                          onChange={e => setReceipts(prev => prev.map(x => x.id === r.id ? { ...x, date: e.target.value } : x))}
                          className="text-xs text-[var(--color-apple-tertiary)] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-[var(--color-apple-blue)] rounded cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-[var(--color-apple-text)]">${receiptEffectiveTotal(r).toFixed(2)}</p>
                      {r.ocr_total && (
                        <p className="text-xs mt-0.5">
                          {isTallied(r)
                            ? <span className="text-[var(--color-apple-green)] font-medium">✓ matches receipt total</span>
                            : <span className="text-[var(--color-apple-red)] font-medium">off by ${Math.abs(receiptEffectiveTotal(r) - r.ocr_total).toFixed(2)}</span>
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tally row */}
                  {(() => {
                    const tax = effectiveTaxTotal(r) + embeddedTaxTotal(r)
                    const tip = tipTotal(r)
                    const pretax = receiptEffectiveTotal(r) - tax - tip
                    return (
                      <div className="flex items-center gap-2 text-xs mt-1 flex-wrap">
                        <span className="text-[var(--color-apple-tertiary)]">Subtotal <strong className="text-[var(--color-apple-text)]">${pretax.toFixed(2)}</strong></span>
                        {tax > 0.01 && <>
                          <span className="text-[var(--color-caption)]">+</span>
                          <span className="text-[var(--color-apple-tertiary)]">Tax <strong className="text-[var(--color-apple-text)]">${tax.toFixed(2)}</strong></span>
                        </>}
                        {tip > 0.01 && <>
                          <span className="text-[var(--color-caption)]">+</span>
                          <span className="text-[var(--color-apple-tertiary)]">Tip <strong className="text-[var(--color-apple-text)]">${tip.toFixed(2)}</strong></span>
                        </>}
                        {r.ocr_total && (
                          isTallied(r)
                            ? <span className="text-[var(--color-apple-green)] font-semibold ml-auto">✓</span>
                            : <span className="text-[var(--color-apple-red)] font-semibold ml-auto">⚠ off by ${Math.abs(receiptEffectiveTotal(r) - r.ocr_total).toFixed(2)}</span>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {r.items.map(item => {
                  const effective = itemTotal(item)
                  const base = item.unitPrice * item.quantity
                  const discounted = Math.max(0, base - (item.discountAmount || 0))
                  const taxAmt = item.isTaxable ? discounted * (item.taxRate / 100) : 0

                  // Tax / tip lines — compact read-only row, auto-split equally
                  if (item.isTaxLine || item.isTipLine) {
                    const effectiveAmt = item.isTaxLine ? effectiveTaxLineAmount(r, item) : itemTotal(item)
                    const label = item.isTipLine ? 'Tip' : 'Tax'
                    const color = item.isTipLine ? 'text-[var(--color-apple-tip-text)] bg-[var(--color-apple-blue-light)]' : 'text-[var(--color-apple-tax-text)] bg-[var(--color-apple-tax-bg)]'
                    const perPerson = people.length > 0 ? effectiveAmt / people.length : 0
                    return (
                      <div key={item.id} className="border-b border-[var(--color-divider)] last:border-0 px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                          <span className="text-sm text-[var(--color-apple-tertiary)]">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {effectiveAmt > 0.01 && perPerson > 0 && (
                            <span className="text-xs text-[var(--color-caption)]">${perPerson.toFixed(2)}/person</span>
                          )}
                          <span className="text-sm font-semibold text-[var(--color-apple-text)]">${effectiveAmt.toFixed(2)}</span>
                          <span className="text-xs text-[var(--color-apple-green)] font-medium">✓ auto</span>
                        </div>
                      </div>
                    )
                  }

                  const isEditing = editingItemId === item.id
                  return (
                    <div key={item.id} className="border-b border-[var(--color-divider)] last:border-0 px-5 py-4">
                      {/* Read-only row: name left, price + actions right */}
                      <div className="flex items-start justify-between mb-2.5">
                        <span className="text-sm font-medium text-[var(--color-apple-text)] flex-1 mr-3 leading-snug">{item.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="text-right mr-1">
                            <span className={`text-sm font-semibold ${isEditing ? 'text-[var(--color-apple-blue)]' : 'text-[var(--color-apple-text)]'}`}>
                              ${effective.toFixed(2)}
                            </span>
                            {item.isTaxable && taxAmt > 0.001 && (
                              <p className="text-xs text-[var(--color-apple-tax-text)] mt-0.5">${discounted.toFixed(2)} +${taxAmt.toFixed(2)} tax</p>
                            )}
                            {item.discountAmount > 0 && (
                              <p className="text-xs text-[var(--color-apple-green)] mt-0.5">-${item.discountAmount.toFixed(2)} discount</p>
                            )}
                          </div>
                          <button
                            onClick={() => setEditingItemId(isEditing ? null : item.id)}
                            className={iconBtnEdit}
                            title="Edit item"
                          >
                            <IconPencil />
                          </button>
                          <button
                            onClick={() => {
                              setReceipts(prev => prev.map(rx => rx.id !== r.id ? rx : { ...rx, items: rx.items.filter(i => i.id !== item.id) }))
                              if (editingItemId === item.id) setEditingItemId(null)
                            }}
                            className={iconBtnDelete}
                            title="Delete item"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>

                      {/* Inline edit panel (shown on tap) */}
                      {isEditing && (
                        <div className="bg-[var(--color-apple-sidebar)] rounded-xl p-3 mb-3 space-y-3 border border-[var(--color-card-border)]">
                          {/* Name */}
                          <div>
                            <p className="text-xs text-[var(--color-apple-tertiary)] mb-1">Name</p>
                            <input
                              value={item.name}
                              onChange={e => updateItem(r.id, item.id, { name: e.target.value })}
                              className="w-full border border-[var(--color-apple-border)] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-apple-blue)] bg-white"
                            />
                          </div>
                          {/* Qty × Price | Discount | Tax */}
                          <div className="grid grid-cols-3 gap-2.5">
                            <div>
                              <p className="text-xs text-[var(--color-apple-tertiary)] mb-1">Qty × Price</p>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number" min="1" step="1"
                                  value={item.quantity}
                                  onChange={e => updateItem(r.id, item.id, { quantity: parseFloat(e.target.value) || 1 })}
                                  className="w-9 border border-[var(--color-apple-border)] rounded-lg px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[var(--color-apple-blue)] bg-white"
                                />
                                <span className="text-[var(--color-caption)] text-xs">×</span>
                                <div className="relative flex-1">
                                  <span className="absolute left-1.5 top-1 text-xs text-[var(--color-caption)]">$</span>
                                  <input
                                    type="number" min="0" step="0.01"
                                    value={item.unitPrice}
                                    onChange={e => updateItem(r.id, item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                    className="w-full border border-[var(--color-apple-border)] rounded-lg pl-4 pr-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-apple-blue)] bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-[var(--color-apple-tertiary)] mb-1">Discount</p>
                              <div className="relative">
                                <span className="absolute left-2 top-1 text-xs text-[var(--color-caption)]">-$</span>
                                <input
                                  type="number" min="0" step="0.01"
                                  value={item.discountAmount || ''}
                                  placeholder="0.00"
                                  onChange={e => updateItem(r.id, item.id, { discountAmount: parseFloat(e.target.value) || 0 })}
                                  className="w-full border border-[var(--color-apple-border)] rounded-lg pl-5 pr-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-apple-blue)] bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs text-[var(--color-apple-tertiary)] mb-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={item.isTaxable}
                                  onChange={e => updateItem(r.id, item.id, { isTaxable: e.target.checked })}
                                  className="w-3 h-3 accent-[var(--color-apple-blue)]"
                                />
                                Tax
                              </label>
                              <div className="relative">
                                <input
                                  type="number" min="0" max="100" step="0.01"
                                  value={item.taxRate}
                                  disabled={!item.isTaxable}
                                  onChange={e => updateItem(r.id, item.id, { taxRate: parseFloat(e.target.value) || 0 })}
                                  className="w-full border border-[var(--color-apple-border)] rounded-lg pl-2 pr-5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-apple-blue)] disabled:opacity-30 disabled:bg-[var(--color-divider)] bg-white"
                                />
                                <span className="absolute right-2 top-1 text-xs text-[var(--color-caption)]">%</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="text-xs bg-[var(--color-apple-blue)] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[var(--color-apple-blue-hover)] transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Assign people */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            const allIn = people.every(p => item.assignedTo.includes(p.id))
                            setReceipts(prev => prev.map(rx => rx.id !== r.id ? rx : {
                              ...rx,
                              items: rx.items.map(i => i.id !== item.id ? i : {
                                ...i, assignedTo: allIn ? [] : people.map(p => p.id)
                              })
                            }))
                          }}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-divider)] text-[var(--color-apple-secondary)] hover:bg-[var(--color-card-border)] transition-colors"
                        >
                          {people.every(p => item.assignedTo.includes(p.id)) ? 'Clear' : 'All'}
                        </button>
                        {people.map(person => {
                          const on = item.assignedTo.includes(person.id)
                          const share = on && item.assignedTo.length > 0 ? effective / item.assignedTo.length : null
                          return (
                            <button
                              key={person.id}
                              onClick={() => togglePerson(r.id, item.id, person.id)}
                              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                              style={{ background: on ? avatarColor(person.name).bg : 'var(--color-divider)', color: on ? avatarColor(person.name).text : 'var(--color-chip-text)' }}
                            >
                              {person.name}{share !== null ? ` $${share.toFixed(2)}` : ''}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {(() => {
              const untallied = receipts.filter(r => !isTallied(r))
              const taxUnassigned = false // tax lines are auto-assigned on scan
              const doubleTax = receipts.some(r => hasDoubleTax(r))
              const canProceed = untallied.length === 0 && !taxUnassigned && !doubleTax
              return (
                <div className="space-y-2 pt-2">
                  {untallied.length > 0 && (
                    <div className="bg-[var(--color-apple-danger-bg)] border border-[var(--color-apple-danger-border)] rounded-2xl px-4 py-3 text-xs text-[var(--color-apple-red)] font-medium">
                      ⚠️ {untallied.length} receipt{untallied.length > 1 ? 's' : ''} {untallied.length > 1 ? 'have' : 'has'} item totals that don't match the scanned total. Fix before proceeding.
                    </div>
                  )}
                  {taxUnassigned && (
                    <div className="bg-[var(--color-apple-tax-bg)] border border-[var(--color-apple-warning-border)] rounded-2xl px-4 py-3 text-xs text-[var(--color-apple-tax-text)] font-medium">
                      ⚠️ Some tax lines haven't been assigned to anyone yet.
                    </div>
                  )}
                  {doubleTax && (
                    <div className="bg-[var(--color-apple-warning-bg-2)] border border-[var(--color-apple-warning-border-2)] rounded-2xl px-4 py-3 text-xs text-[var(--color-apple-warning-text-2)] font-medium">
                      ⚠️ Tax is being double-counted on one or more receipts. Uncheck the Tax checkbox on individual items where a TAX line already exists.
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setStep('receipts')} className="px-4 py-2.5 rounded-xl text-sm text-[var(--color-apple-secondary)] hover:bg-[var(--color-divider)] transition-colors">← Back</button>
                    <button
                      onClick={() => setStep('summary')}
                      disabled={!canProceed}
                      title={!canProceed ? 'Fix tally issues above first' : ''}
                      className="flex-1 bg-[var(--color-apple-blue)] text-white py-2.5 rounded-2xl text-sm font-semibold hover:bg-[var(--color-apple-blue-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      See who owes what →
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── STEP 4: SUMMARY ──────────────────────────────────────────────── */}
        {step === 'summary' && (
          <div className="space-y-4">

            {/* ← Edit */}
            <button
              onClick={() => setStep('review')}
              className="flex items-center gap-1 text-sm text-[var(--color-apple-blue)] hover:text-[var(--color-apple-blue-hover)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Edit
            </button>

            {/* Expense header card */}
            <div className="bg-white rounded-2xl border border-[var(--color-card-border)] p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-apple-warm-bg, var(--color-apple-card)0eb)] flex items-center justify-center shrink-0">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-apple-warm-icon)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="18" rx="2"/>
                    <line x1="8" y1="9" x2="16" y2="9"/>
                    <line x1="8" y1="13" x2="16" y2="13"/>
                    <line x1="8" y1="17" x2="12" y2="17"/>
                  </svg>
                </div>
                <div>
                  <p className="text-base font-semibold text-[var(--color-apple-text)] leading-snug">
                    {receipts.length === 1
                      ? receipts[0].merchantName || 'Receipt'
                      : receipts.map(r => r.merchantName || 'Receipt').join(', ')}
                  </p>
                  <p className="text-4xl font-bold text-[var(--color-apple-text)] tracking-tight mt-0.5">${grandTotal.toFixed(2)}</p>
                  <p className="text-xs text-[var(--color-apple-tertiary)] mt-2">
                    Added by you on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Payer + people hierarchy */}
            <div className="bg-white rounded-2xl border border-[var(--color-card-border)] p-5">
              {(() => {
                const payers = summary.filter(s => s.paid > 0)
                return (
                  <div>
                    {/* Paid by */}
                    <p className="text-xs font-semibold text-[var(--color-apple-tertiary)] uppercase tracking-widest mb-3">Paid by</p>
                    <div className="space-y-3 mb-4">
                      {payers.map(({ person, paid }) => (
                        <div key={person.id} className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                            style={{ background: avatarColor(person.name).bg, color: avatarColor(person.name).text }}
                          >
                            {person.name[0].toUpperCase()}
                          </div>
                          <p className="text-base font-semibold text-[var(--color-apple-text)]">
                            {person.name} paid ${paid.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[var(--color-divider)] mb-4" />
                    <p className="text-xs font-semibold text-[var(--color-apple-tertiary)] uppercase tracking-widest mb-3">Each person's share</p>

                    {/* Per-person breakdown */}
                    <div className="space-y-4">
                      {summary.map(({ person, share, net }) => (
                        <div key={person.id} className="flex items-center gap-4">
                          <div className="w-14 flex items-center justify-center shrink-0">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold z-10"
                              style={{ background: avatarColor(person.name).bg, color: avatarColor(person.name).text }}
                            >
                              {person.name[0].toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-[var(--color-apple-text)]">
                              {net > 0.01 ? (
                                <><span className="font-semibold">{person.name}</span> owes <span className="font-semibold text-[var(--color-apple-orange)]">${net.toFixed(2)}</span></>
                              ) : net < -0.01 ? (
                                <><span className="font-semibold">{person.name}</span> gets back <span className="font-semibold text-[var(--color-apple-green)]">${Math.abs(net).toFixed(2)}</span></>
                              ) : (
                                <><span className="font-semibold">{person.name}</span> <span className="text-[var(--color-caption)]">· settled</span></>
                              )}
                            </p>
                            <p className="text-xs text-[var(--color-caption)]">share ${share.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>


            {/* Shareable text summary */}
            <div className="bg-white rounded-2xl border border-[var(--color-card-border)] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[var(--color-apple-tertiary)] uppercase tracking-widest">Shareable summary</p>
                <button
                  onClick={copyChatSummary}
                  className="text-xs text-[var(--color-apple-blue)] hover:text-[var(--color-apple-blue-hover)] font-medium transition-colors"
                >
                  {copyState === 'done' ? 'Copied!' : copyState === 'error' ? 'Copy failed' : 'Copy text'}
                </button>
              </div>
              <textarea
                readOnly
                value={chatSummaryText}
                className="w-full h-56 border border-[var(--color-card-border)] rounded-xl p-3 text-xs text-[var(--color-apple-text)] bg-[var(--color-apple-sidebar)] focus:outline-none resize-y"
              />
              <p className="text-xs text-[var(--color-apple-tertiary)] mt-2">Send this in your group chat.</p>
            </div>

            {/* Receipt breakdown */}
            <div className="bg-white rounded-2xl border border-[var(--color-card-border)] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[var(--color-apple-tertiary)] uppercase tracking-widest">
                  {receipts.length > 1 ? `${receipts.length} Receipts` : 'Receipt'}
                </p>
                <button
                  onClick={() => setStep('review')}
                  className="text-xs text-[var(--color-apple-blue)] hover:text-[var(--color-apple-blue-hover)] font-medium transition-colors"
                >
                  Edit all
                </button>
              </div>
              {receipts.map((r, i) => {
                const regItems = r.items.filter(x => !x.isTaxLine && !x.isTipLine)
                const tipAmt = r.items.filter(x => x.isTipLine).reduce((s, x) => s + itemTotal(x), 0)
                const taxAmt = embeddedTaxTotal(r) + effectiveTaxTotal(r)
                const payer = people.find(p => p.id === r.paidById)
                return (
                  <div key={r.id} className="py-3 border-b border-[var(--color-divider)] last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--color-apple-text)] truncate flex-1 mr-3">{r.merchantName || `Receipt ${i + 1}`}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-[var(--color-apple-text)]">${receiptEffectiveTotal(r).toFixed(2)}</span>
                        <button
                          onClick={() => {
                            setStep('review')
                            setTimeout(() => {
                              document.getElementById(`receipt-${r.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }, 80)
                          }}
                          className="text-xs text-[var(--color-apple-blue)] hover:text-[var(--color-apple-blue-hover)] font-medium transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-[var(--color-apple-tertiary)]">
                      <span>{regItems.length} item{regItems.length !== 1 ? 's' : ''}</span>
                      {taxAmt > 0.01 && <span>· Tax ${taxAmt.toFixed(2)}</span>}
                      {tipAmt > 0.01 && <span>· Tip ${tipAmt.toFixed(2)}</span>}
                      {payer && <span>· Paid by {payer.name}</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Save / Update */}
            {saveSplit.isSuccess && !saveSplit.isPending ? (
              <div className="bg-[var(--color-apple-green-bg)] border border-[var(--color-apple-green)]/30 rounded-2xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-apple-success-text)]">✓ Split saved</p>
                  <p className="text-xs text-[var(--color-apple-tertiary)] mt-0.5">Reload it anytime from Activity</p>
                </div>
                <button onClick={() => saveSplit.mutate()} className="text-xs text-[var(--color-apple-blue)] font-medium hover:underline">
                  Update
                </button>
              </div>
            ) : (
              <button
                onClick={() => saveSplit.mutate()}
                disabled={saveSplit.isPending}
                className="w-full bg-[var(--color-apple-text)] text-white py-3 rounded-2xl text-sm font-semibold hover:bg-[var(--color-chip-text)] transition-colors disabled:opacity-40"
              >
                {saveSplit.isPending ? 'Saving…' : savedSplitId ? 'Update saved split' : 'Save split'}
              </button>
            )}
            {saveSplit.isError && (
              <p className="text-xs text-[var(--color-apple-red)] text-center">Failed to save — try again</p>
            )}

            <button
              onClick={() => { setPeople([]); setReceipts([]); setSavedSplitId(null); saveSplit.reset(); setStep('people') }}
              className="w-full text-sm text-[var(--color-apple-tertiary)] hover:text-[var(--color-apple-text)] py-3 rounded-2xl hover:bg-[var(--color-divider)] transition-colors"
            >
              Start a new split
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
