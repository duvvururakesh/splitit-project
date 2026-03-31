import client from './client'

export const getFriends = () => client.get('/friends/').then(r => r.data)
export const getFriendRequests = () => client.get('/friends/requests').then(r => r.data)
export const sendFriendRequest = (email: string) => client.post('/friends/request', { email }).then(r => r.data)
export const acceptFriendRequest = (id: string) => client.patch(`/friends/request/${id}?action=accept`).then(r => r.data)
export const declineFriendRequest = (id: string) => client.patch(`/friends/request/${id}?action=decline`).then(r => r.data)
export const removeFriend = (userId: string) => client.delete(`/friends/${userId}`)
