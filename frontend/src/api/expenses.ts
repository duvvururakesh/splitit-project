import client from './client'

export const getExpenses = (group_id?: string, with_user_id?: string) =>
  client.get('/expenses/', { params: { ...(group_id ? { group_id } : {}), ...(with_user_id ? { with_user_id } : {}) } }).then(r => r.data)

export const getExpense = (id: string) => client.get(`/expenses/${id}`).then(r => r.data)

export const createExpense = (data: any) => client.post('/expenses/', data).then(r => r.data)

export const updateExpense = (id: string, data: any) => client.patch(`/expenses/${id}`, data).then(r => r.data)

export const deleteExpense = (id: string) => client.delete(`/expenses/${id}`)

export const getMyBalances = (group_id?: string) =>
  client.get('/expenses/balances/me', { params: group_id ? { group_id } : {} }).then(r => r.data)

export const createSettlement = (data: { payee_id: string; amount: number; payer_id?: string; group_id?: string }) =>
  client.post('/settlements/', data).then(r => r.data)

export const getSettlements = (group_id?: string) =>
  client.get('/settlements/', { params: group_id ? { group_id } : {} }).then(r => r.data)
