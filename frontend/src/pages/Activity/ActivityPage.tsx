import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listBillSplits, deleteBillSplit } from '../../api/billSplits'
import type { BillSplitResponse } from '../../api/billSplits'
import PageHeader from '../../components/ui/PageHeader'
import PageContainer from '../../components/ui/PageContainer'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import IconButton from '../../components/ui/IconButton'
import { IconActivity, IconPlus, IconReceipt, IconTrash } from '../../utils/icons'

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getSplitSummary(s: BillSplitResponse) {
  const state = s.state as any
  const people: { name: string }[] = state?.people || []
  const receipts: any[] = state?.receipts || []

  let grandTotal = 0
  for (const r of receipts) {
    for (const item of r.items || []) {
      const base = (item.unitPrice || 0) * (item.quantity || 1)
      const afterDiscount = Math.max(0, base - (item.discountAmount || 0))
      const tax = item.isTaxable ? afterDiscount * ((item.taxRate || 0) / 100) : 0
      grandTotal += afterDiscount + tax
    }
  }

  const receiptSummaries = receipts.map((r: any) => {
    let total = 0
    let itemCount = 0
    for (const item of r.items || []) {
      if (item.isTaxLine || item.isTipLine) continue
      const base = (item.unitPrice || 0) * (item.quantity || 1)
      const afterDiscount = Math.max(0, base - (item.discountAmount || 0))
      const tax = item.isTaxable ? afterDiscount * ((item.taxRate || 0) / 100) : 0
      total += afterDiscount + tax
      itemCount++
    }
    for (const item of r.items || []) {
      if (item.isTipLine) total += (item.unitPrice || 0) * (item.quantity || 1)
    }
    return { name: r.merchantName || 'Receipt', total, itemCount }
  })

  return { people, receiptSummaries, grandTotal }
}

export default function ActivityPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['bill-splits'],
    queryFn: listBillSplits,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteBillSplit(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bill-splits'] }),
    onSettled: () => setDeletingId(null),
  })

  return (
    <div>
      <PageHeader
        title="Activity"
        right={
          <Button onClick={() => navigate('/split')} size="md">
            <IconPlus size={14} />
            New split
          </Button>
        }
      />

      <PageContainer>
        {isLoading ? (
          <div className="text-center text-[var(--color-apple-tertiary)] text-sm py-16">Loading...</div>
        ) : splits.length === 0 ? (
          <Card className="p-14 text-center">
            <div className="w-14 h-14 bg-[var(--color-divider)] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[var(--color-caption)]">
              <IconActivity size={24} />
            </div>
            <p className="text-[var(--color-apple-text)] font-medium mb-1">No saved splits yet</p>
            <p className="text-[var(--color-apple-tertiary)] text-sm mb-5">Calculate a bill and save it to see it here</p>
            <Button onClick={() => navigate('/split')}>Start a split</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {splits.map(s => {
              const { people, receiptSummaries, grandTotal } = getSplitSummary(s)
              return (
                <Card
                  key={s.id}
                  className="group px-5 py-4 hover:border-[var(--color-apple-blue)] hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate(`/split?load=${s.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--color-apple-text)] truncate">{s.title || 'Bill Split'}</p>
                        {receiptSummaries.length > 1 && (
                          <Badge variant="info">{receiptSummaries.length} receipts</Badge>
                        )}
                      </div>

                      {receiptSummaries.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {receiptSummaries.map((r, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs bg-[var(--color-divider)] text-[var(--color-chip-text-strong)] px-2.5 py-1 rounded-full">
                              <IconReceipt size={12} />
                              <span className="font-medium">{r.name}</span>
                              {r.itemCount > 0 && (
                                <span className="text-[var(--color-apple-tertiary)]">· {r.itemCount} items · ${r.total.toFixed(2)}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {people.length > 0 && (
                        <p className="text-xs text-[var(--color-apple-tertiary)] mt-1.5">{people.map(p => p.name).join(' · ')}</p>
                      )}

                      <p className="text-xs text-[var(--color-caption)] mt-1">
                        {formatDate(s.updated_at)} · {formatTime(s.updated_at)}
                      </p>
                    </div>

                    <div className="flex items-start gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold text-[var(--color-apple-text)]">${grandTotal.toFixed(2)}</p>
                        <p className="text-xs text-[var(--color-apple-tertiary)]">{people.length} {people.length === 1 ? 'person' : 'people'}</p>
                      </div>

                      <IconButton
                        onClick={e => {
                          e.stopPropagation()
                          if (!confirm('Delete this saved split?')) return
                          setDeletingId(s.id)
                          remove.mutate(s.id)
                        }}
                        disabled={deletingId === s.id}
                        variant="delete"
                        className="mt-1"
                        title="Delete"
                      >
                        {deletingId === s.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-[var(--color-apple-red)] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <IconTrash size={14} />
                        )}
                      </IconButton>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </PageContainer>
    </div>
  )
}
