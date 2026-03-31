import client from './client'

export const uploadReceipt = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  // Do NOT set Content-Type manually — axios sets it automatically with the
  // correct multipart boundary when given a FormData object.
  return client.post('/receipts/upload', form).then(r => r.data)
}

export const scanReceipt = (receiptId: string) =>
  client.post(`/receipts/${receiptId}/scan`).then(r => r.data)

export const getReceipt = (receiptId: string) =>
  client.get(`/receipts/${receiptId}`).then(r => r.data)

export const updateReceiptItem = (receiptId: string, itemId: string, data: any) =>
  client.patch(`/receipts/${receiptId}/items/${itemId}`, data).then(r => r.data)

export const createExpenseFromReceipt = (data: any) =>
  client.post('/receipts/create-expense', data).then(r => r.data)

export const updateReceiptItemAssignments = (receiptId: string, itemId: string, userIds: string[]) =>
  client.put(`/receipts/${receiptId}/items/${itemId}/assignments`, { receipt_item_id: itemId, user_ids: userIds }).then(r => r.data)
