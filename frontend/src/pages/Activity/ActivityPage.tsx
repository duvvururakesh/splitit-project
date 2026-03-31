import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listBillSplits, deleteBillSplit } from '../../api/billSplits'
import type { BillSplitResponse } from '../../api/billSplits'

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

  // recompute grand total from saved receipt state
  let grandTotal = 0
  for (const r of receipts) {
    for (const item of r.items || []) {
      const base = (item.unitPrice || 0) * (item.quantity || 1)
      const afterDiscount = Math.max(0, base - (item.discountAmount || 0))
      const tax = item.isTaxable ? afterDiscount * ((item.taxRate || 0) / 100) : 0
      grandTotal += afterDiscount + tax
    }
  }

  // Per-receipt totals for display
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
    // add tips
    for (const item of r.items || []) {
      if (item.isTipLine) {
        total += (item.unitPrice || 0) * (item.quantity || 1)
      }
    }
    return { name: r.merchantName || 'Receipt', total, itemCount }
  })

  return {
    people,
    receipts,
    receiptSummaries,
    grandTotal,
  }
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
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8ed] px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Activity</h1>
          <button
            onClick={() => navigate('/split')}
            className="flex items-center gap-1.5 bg-[#0071e3] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#0077ed] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New split
          </button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="text-center text-[#86868b] text-sm py-16">Loading...</div>
        ) : splits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e8e8ed] p-14 text-center">
            <div className="w-14 h-14 bg-[#f2f2f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <p className="text-[#1d1d1f] font-medium mb-1">No saved splits yet</p>
            <p className="text-[#86868b] text-sm mb-5">Calculate a bill and save it to see it here</p>
            <button
              onClick={() => navigate('/split')}
              className="bg-[#0071e3] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#0077ed] transition-colors"
            >
              Start a split →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {splits.map(s => {
              const { people, receiptSummaries, grandTotal } = getSplitSummary(s)
              return (
                <div
                  key={s.id}
                  className="group bg-white rounded-2xl border border-[#e8e8ed] px-5 py-4 hover:border-[#0071e3] hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate(`/split?load=${s.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#1d1d1f] truncate">{s.title || 'Bill Split'}</p>
                        {receiptSummaries.length > 1 && (
                          <span className="shrink-0 text-xs bg-[#e8f1fb] text-[#0071e3] px-2 py-0.5 rounded-full font-medium">
                            {receiptSummaries.length} receipts
                          </span>
                        )}
                      </div>

                      {/* Receipt tiles */}
                      {receiptSummaries.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {receiptSummaries.map((r, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs bg-[#f2f2f7] text-[#48484a] px-2.5 py-1 rounded-full">
                              <span>🧾</span>
                              <span className="font-medium">{r.name}</span>
                              {r.itemCount > 0 && (
                                <span className="text-[#86868b]">· {r.itemCount} item{r.itemCount !== 1 ? 's' : ''} · ${r.total.toFixed(2)}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* People */}
                      {people.length > 0 && (
                        <p className="text-xs text-[#86868b] mt-1.5">
                          {people.map(p => p.name).join(' · ')}
                        </p>
                      )}

                      <p className="text-xs text-[#aeaeb2] mt-1">
                        {formatDate(s.updated_at)} · {formatTime(s.updated_at)}
                      </p>
                    </div>

                    {/* Right */}
                    <div className="flex items-start gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#1d1d1f]">${grandTotal.toFixed(2)}</p>
                        <p className="text-xs text-[#86868b]">{people.length} {people.length === 1 ? 'person' : 'people'}</p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (!confirm('Delete this saved split?')) return
                          setDeletingId(s.id)
                          remove.mutate(s.id)
                        }}
                        disabled={deletingId === s.id}
                        className="opacity-0 group-hover:opacity-100 mt-1 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#ffe5e5] text-[#aeaeb2] hover:text-[#ff3b30] transition-all disabled:opacity-40"
                        title="Delete"
                      >
                        {deletingId === s.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-[#ff3b30] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
