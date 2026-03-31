import client from './client'

export const getGroups = () => client.get('/groups/').then(r => r.data)
export const getGroup = (id: string) => client.get(`/groups/${id}`).then(r => r.data)
export const createGroup = (data: { name: string; description?: string }) => client.post('/groups/', data).then(r => r.data)
export const addMember = (groupId: string, email: string) => client.post(`/groups/${groupId}/members`, { email }).then(r => r.data)
export const removeMember = (groupId: string, userId: string) => client.delete(`/groups/${groupId}/members/${userId}`)
