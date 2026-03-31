import client from './client'

export type BillSplitResponse = {
  id: string
  title: string | null
  state: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function createBillSplit(title: string | null, state: object): Promise<BillSplitResponse> {
  const res = await client.post('/bill-splits/', { title, state })
  return res.data
}

export async function listBillSplits(): Promise<BillSplitResponse[]> {
  const res = await client.get('/bill-splits/')
  return res.data
}

export async function updateBillSplit(id: string, title: string | null, state: object): Promise<BillSplitResponse> {
  const res = await client.put(`/bill-splits/${id}`, { title, state })
  return res.data
}

export async function deleteBillSplit(id: string): Promise<void> {
  await client.delete(`/bill-splits/${id}`)
}
