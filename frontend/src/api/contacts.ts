import client from './client'

export type Contact = { id: string; name: string; note?: string }
export type ContactGroup = { id: string; name: string; member_ids: string[] }

export const listContacts = () => client.get('/contacts/').then(r => r.data as Contact[])
export const createContact = (name: string, note?: string) => client.post('/contacts/', { name, note }).then(r => r.data as Contact)
export const updateContact = (id: string, data: { name?: string; note?: string }) => client.patch(`/contacts/${id}`, data).then(r => r.data as Contact)
export const deleteContact = (id: string) => client.delete(`/contacts/${id}`)

export const listGroups = () => client.get('/contacts/groups').then(r => r.data as ContactGroup[])
export const createGroup = (name: string, member_ids: string[]) => client.post('/contacts/groups', { name, member_ids }).then(r => r.data as ContactGroup)
export const updateGroup = (id: string, data: { name?: string; member_ids?: string[] }) => client.patch(`/contacts/groups/${id}`, data).then(r => r.data as ContactGroup)
export const deleteGroup = (id: string) => client.delete(`/contacts/groups/${id}`)
