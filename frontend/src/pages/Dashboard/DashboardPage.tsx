import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '../../components/ui/PageHeader'
import PageContainer from '../../components/ui/PageContainer'
import Card from '../../components/ui/Card'
import { getMyBalances } from '../../api/expenses'
import { getFriends } from '../../api/friends'
import { getGroups } from '../../api/groups'

type BalanceEntry = {
  user_id: string
  display_name: string
  avatar_url?: string | null
  balance: number
}

type FriendResp = {
  id: string
  status: string
  friend: { id: string; display_name: string; email: string; avatar_url?: string | null; balance: number }
}

type FilterMode = 'none' | 'friends_outstanding' | 'friends_i_owe' | 'friends_owe_me'

export default function DashboardPage() {
  const [filter, setFilter] = useState<FilterMode>('none')

  const { data: balances = [] } = useQuery<BalanceEntry[]>({
    queryKey: ['dashboard-balances'],
    queryFn: () => getMyBalances(),
  })

  const { data: friends = [] } = useQuery<FriendResp[]>({
    queryKey: ['friends'],
    queryFn: getFriends,
  })

  const { data: groups = [] } = useQuery<any[]>({
    queryKey: ['groups'],
    queryFn: getGroups,
  })

  const friendIdSet = useMemo(() => new Set(friends.map(f => f.friend.id)), [friends])

  const visibleBalances = useMemo(() => {
    const nonZero = balances.filter(b => Math.abs(b.balance) >= 0.01)
    switch (filter) {
      case 'friends_outstanding':
        return nonZero.filter(b => friendIdSet.has(b.user_id))
      case 'friends_i_owe':
        return nonZero.filter(b => friendIdSet.has(b.user_id) && b.balance < 0)
      case 'friends_owe_me':
        return nonZero.filter(b => friendIdSet.has(b.user_id) && b.balance > 0)
      case 'none':
      default:
        return nonZero
    }
  }, [balances, filter, friendIdSet])

  const totals = useMemo(() => {
    let owedToMe = 0
    let iOwe = 0
    for (const b of balances) {
      if (b.balance > 0) owedToMe += b.balance
      if (b.balance < 0) iOwe += Math.abs(b.balance)
    }
    return {
      owedToMe: Number(owedToMe.toFixed(2)),
      iOwe: Number(iOwe.toFixed(2)),
      net: Number((owedToMe - iOwe).toFixed(2)),
    }
  }, [balances])

  const groupBalanceQueries = useQuery({
    queryKey: ['groups-balance-rollup', groups.map((g: any) => g.id).join(',')],
    enabled: groups.length > 0,
    queryFn: async () => {
      const rows = await Promise.all(
        groups.map(async (g: any) => {
          const gb: BalanceEntry[] = await getMyBalances(g.id)
          const net = gb.reduce((sum, b) => sum + b.balance, 0)
          return { id: g.id, name: g.name, net: Number(net.toFixed(2)) }
        }),
      )
      return rows
    },
  })

  return (
    <div>
      <PageHeader title="Dashboard" />
      <PageContainer className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs text-[var(--color-apple-tertiary)] uppercase tracking-widest">Overall owed to you</p>
            <p className="text-2xl font-semibold text-[var(--color-apple-text)] mt-1">${totals.owedToMe.toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[var(--color-apple-tertiary)] uppercase tracking-widest">Overall you owe</p>
            <p className="text-2xl font-semibold text-[var(--color-apple-text)] mt-1">${totals.iOwe.toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[var(--color-apple-tertiary)] uppercase tracking-widest">Net</p>
            <p className={`text-2xl font-semibold mt-1 ${totals.net >= 0 ? 'text-[var(--color-apple-green)]' : 'text-[var(--color-apple-red)]'}`}>
              ${Math.abs(totals.net).toFixed(2)} {totals.net >= 0 ? 'up' : 'owed'}
            </p>
          </Card>
        </div>

        <Card className="p-4">
          <p className="text-xs text-[var(--color-apple-tertiary)] uppercase tracking-widest mb-3">Filters</p>
          <div className="flex flex-wrap gap-2">
            {[
              ['none', 'None'],
              ['friends_outstanding', 'Friends with outstanding balances'],
              ['friends_i_owe', 'Friends you owe'],
              ['friends_owe_me', 'Friends who owe you'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value as FilterMode)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filter === value
                    ? 'bg-[var(--color-apple-blue-light)] text-[var(--color-apple-blue)] border-[var(--color-apple-blue)]'
                    : 'bg-[var(--color-chip-bg)] text-[var(--color-chip-text)] border-[var(--color-card-border)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-divider)]">
            <p className="text-xs text-[var(--color-apple-tertiary)] uppercase tracking-widest">Who owes whom</p>
          </div>
          {visibleBalances.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--color-apple-tertiary)]">No balances for this filter.</p>
          ) : (
            <div className="divide-y divide-[var(--color-divider)]">
              {visibleBalances.map(b => (
                <div key={b.user_id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-apple-text)]">{b.display_name}</p>
                    <p className="text-xs text-[var(--color-apple-tertiary)]">
                      {b.balance > 0 ? `${b.display_name} owes you` : `You owe ${b.display_name}`}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${b.balance > 0 ? 'text-[var(--color-apple-green)]' : 'text-[var(--color-apple-red)]'}`}>
                    ${Math.abs(b.balance).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-divider)]">
            <p className="text-xs text-[var(--color-apple-tertiary)] uppercase tracking-widest">Group tally</p>
          </div>
          {groups.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--color-apple-tertiary)]">No groups yet.</p>
          ) : (
            <div className="divide-y divide-[var(--color-divider)]">
              {(groupBalanceQueries.data || []).map((g: any) => (
                <div key={g.id} className="px-4 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--color-apple-text)]">{g.name}</p>
                  <p className={`text-sm font-semibold ${g.net >= 0 ? 'text-[var(--color-apple-green)]' : 'text-[var(--color-apple-red)]'}`}>
                    ${Math.abs(g.net).toFixed(2)} {g.net >= 0 ? 'owed to you' : 'you owe'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageContainer>
    </div>
  )
}
