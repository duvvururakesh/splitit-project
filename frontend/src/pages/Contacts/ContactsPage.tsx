import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listContacts, createContact, updateContact, deleteContact,
  listGroups, createGroup, updateGroup, deleteGroup,
  type Contact,
} from '../../api/contacts'
import { avatarColor } from '../../utils/avatar'
import { IconPencil, IconTrash } from '../../utils/icons'
import { acceptFriendRequest, getFriendRequests, getFriends, sendFriendRequest } from '../../api/friends'
import PageHeader from '../../components/ui/PageHeader'
import PageContainer from '../../components/ui/PageContainer'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'

export default function ContactsPage() {
  const qc = useQueryClient()
  const { data: contacts = [] } = useQuery({ queryKey: ['contacts'], queryFn: listContacts })
  const { data: groups = [] } = useQuery({ queryKey: ['contact-groups'], queryFn: listGroups })
  const { data: friends = [] } = useQuery<any[]>({ queryKey: ['friends'], queryFn: getFriends })
  const { data: friendRequests = [] } = useQuery<any[]>({ queryKey: ['friend-requests'], queryFn: getFriendRequests })

  const [tab, setTab] = useState<'contacts' | 'groups'>('contacts')
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [search, setSearch] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([])
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupMembers, setEditGroupMembers] = useState<string[]>([])
  const [friendEmail, setFriendEmail] = useState('')

  const addContactMut = useMutation({
    mutationFn: ({ name, note }: { name: string; note?: string }) => createContact(name, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setNewName(''); setNewNote('') },
  })
  const updateContactMut = useMutation({
    mutationFn: ({ id, name, note }: { id: string; name: string; note?: string }) => updateContact(id, { name, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setEditingId(null) },
  })
  const deleteContactMut = useMutation({ mutationFn: deleteContact, onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }) })
  const addGroupMut = useMutation({
    mutationFn: ({ name, member_ids }: { name: string; member_ids: string[] }) => createGroup(name, member_ids),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contact-groups'] }); setNewGroupName(''); setNewGroupMembers([]) },
  })
  const updateGroupMut = useMutation({
    mutationFn: ({ id, name, member_ids }: { id: string; name: string; member_ids: string[] }) => updateGroup(id, { name, member_ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contact-groups'] }); setEditingGroupId(null) },
  })
  const deleteGroupMut = useMutation({ mutationFn: deleteGroup, onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-groups'] }) })
  const sendFriendMut = useMutation({
    mutationFn: (email: string) => sendFriendRequest(email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
      setFriendEmail('')
    },
  })
  const acceptFriendMut = useMutation({
    mutationFn: (id: string) => acceptFriendRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
    },
  })

  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))

  const toggleMember = (id: string, members: string[], setMembers: (m: string[]) => void) =>
    setMembers(members.includes(id) ? members.filter(m => m !== id) : [...members, id])

  return (
    <div>
      <PageHeader title="Contacts" />

      <PageContainer className="space-y-5">
        <Card className="p-5">
          <p className="text-xs font-semibold text-[var(--color-apple-tertiary)] uppercase tracking-widest mb-3">Friends</p>
          <div className="flex gap-2 mb-3">
            <Input
              value={friendEmail}
              onChange={e => setFriendEmail(e.target.value)}
              placeholder="Friend email"
              type="email"
            />
            <Button onClick={() => friendEmail.trim() && sendFriendMut.mutate(friendEmail.trim())} disabled={!friendEmail.trim() || sendFriendMut.isPending}>
              Add friend
            </Button>
          </div>

          {friendRequests.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-[var(--color-apple-tertiary)] mb-2">Pending requests</p>
              <div className="space-y-2">
                {friendRequests.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between bg-[var(--color-divider)] rounded-xl px-3 py-2">
                    <span className="text-sm text-[var(--color-apple-text)]">{r.friend.display_name} ({r.friend.email})</span>
                    <Button size="md" onClick={() => acceptFriendMut.mutate(r.id)}>Accept</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-[var(--color-apple-tertiary)] mb-2">Accepted friends ({friends.length})</p>
            {friends.length === 0 ? (
              <p className="text-sm text-[var(--color-apple-tertiary)]">No friends yet.</p>
            ) : (
              <div className="space-y-1">
                {friends.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between bg-[var(--color-divider)] rounded-xl px-3 py-2">
                    <span className="text-sm text-[var(--color-apple-text)]">{f.friend.display_name}</span>
                    <span className={`text-xs font-medium ${f.friend.balance >= 0 ? 'text-[var(--color-apple-green)]' : 'text-[var(--color-apple-red)]'}`}>
                      {f.friend.balance >= 0 ? 'owes you' : 'you owe'} ${Math.abs(f.friend.balance).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="flex bg-[var(--color-divider)] rounded-xl p-1">
          {(['contacts', 'groups'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium border-none cursor-pointer transition-all ${tab === t ? 'bg-white text-[var(--color-apple-text)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'bg-transparent text-[var(--color-apple-secondary)]'}`}>
              {t === 'contacts' ? `People (${contacts.length})` : `Groups (${groups.length})`}
            </button>
          ))}
        </div>

        {tab === 'contacts' && (
          <>
            <Card className="p-5">
              <p className="text-xs font-semibold text-[var(--color-apple-tertiary)] uppercase tracking-widest mb-3">Add contact</p>
              <div className="flex gap-2">
                <Input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && newName.trim() && addContactMut.mutate({ name: newName.trim(), note: newNote.trim() || undefined })} placeholder="Name" autoFocus />
                <Input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && newName.trim() && addContactMut.mutate({ name: newName.trim(), note: newNote.trim() || undefined })} placeholder="Note (optional)" />
                <Button onClick={() => newName.trim() && addContactMut.mutate({ name: newName.trim(), note: newNote.trim() || undefined })} disabled={!newName.trim() || addContactMut.isPending}>Add</Button>
              </div>
            </Card>

            {contacts.length > 4 && <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." />}

            {filteredContacts.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-apple-tertiary)] text-sm">{contacts.length === 0 ? 'No contacts yet. Add your first one above.' : 'No matches found.'}</div>
            ) : (
              <Card className="overflow-hidden divide-y divide-[var(--color-divider)]">
                {filteredContacts.map(c => (
                  <div key={c.id}>
                    {editingId === c.id ? (
                      <div className="px-4 py-3 flex items-center gap-2">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateContactMut.mutate({ id: c.id, name: editName.trim(), note: editNote.trim() || undefined })} autoFocus className="flex-1 bg-white" />
                        <Input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Note" className="flex-1" />
                        <Button onClick={() => updateContactMut.mutate({ id: c.id, name: editName.trim(), note: editNote.trim() || undefined })}>Save</Button>
                        <Button onClick={() => setEditingId(null)} variant="ghost">Cancel</Button>
                      </div>
                    ) : (
                      <div className="px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: avatarColor(c.name).bg, color: avatarColor(c.name).text }}>
                          {c.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-apple-text)]">{c.name}</p>
                          {c.note && <p className="text-xs text-[var(--color-apple-tertiary)]">{c.note}</p>}
                        </div>
                        <IconButton onClick={() => { setEditingId(c.id); setEditName(c.name); setEditNote(c.note || '') }} variant="edit" title="Edit"><IconPencil size={14} /></IconButton>
                        <IconButton onClick={() => deleteContactMut.mutate(c.id)} variant="delete" title="Remove"><IconTrash size={14} /></IconButton>
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </>
        )}

        {tab === 'groups' && (
          <>
            <Card className="p-5">
              <p className="text-xs font-semibold text-[var(--color-apple-tertiary)] uppercase tracking-widest mb-3">Create group</p>
              {contacts.length === 0 ? (
                <p className="text-sm text-[var(--color-apple-tertiary)]">Add contacts first before creating groups.</p>
              ) : (
                <>
                  <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name (e.g. Roommates, Family)" className="mb-3" />
                  <p className="text-xs text-[var(--color-apple-tertiary)] mb-2">Select members:</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {contacts.map(c => {
                      const on = newGroupMembers.includes(c.id)
                      return (
                        <button key={c.id} onClick={() => toggleMember(c.id, newGroupMembers, setNewGroupMembers)} className="px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-all" style={{ background: on ? avatarColor(c.name).bg : 'var(--color-divider)', color: on ? avatarColor(c.name).text : 'var(--color-chip-text)' }}>
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                  <Button onClick={() => newGroupName.trim() && newGroupMembers.length > 0 && addGroupMut.mutate({ name: newGroupName.trim(), member_ids: newGroupMembers })} disabled={!newGroupName.trim() || newGroupMembers.length === 0 || addGroupMut.isPending}>Create group</Button>
                </>
              )}
            </Card>

            {groups.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-apple-tertiary)] text-sm">No groups yet.</div>
            ) : (
              <div className="space-y-3">
                {groups.map(g => {
                  const members = g.member_ids.map(id => contacts.find(c => c.id === id)).filter(Boolean) as Contact[]
                  return (
                    <Card key={g.id} className="p-5">
                      {editingGroupId === g.id ? (
                        <>
                          <Input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} autoFocus className="mb-3 bg-white" />
                          <div className="flex flex-wrap gap-2 mb-3">
                            {contacts.map(c => {
                              const on = editGroupMembers.includes(c.id)
                              return (
                                <button key={c.id} onClick={() => toggleMember(c.id, editGroupMembers, setEditGroupMembers)} className="px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-all" style={{ background: on ? avatarColor(c.name).bg : 'var(--color-divider)', color: on ? avatarColor(c.name).text : 'var(--color-chip-text)' }}>
                                  {c.name}
                                </button>
                              )
                            })}
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => updateGroupMut.mutate({ id: g.id, name: editGroupName.trim(), member_ids: editGroupMembers })}>Save</Button>
                            <Button onClick={() => setEditingGroupId(null)} variant="ghost">Cancel</Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-apple-text)]">{g.name}</p>
                              <p className="text-xs text-[var(--color-apple-tertiary)]">{members.length} {members.length === 1 ? 'person' : 'people'}</p>
                            </div>
                            <div className="flex gap-2">
                              <IconButton onClick={() => { setEditingGroupId(g.id); setEditGroupName(g.name); setEditGroupMembers(g.member_ids) }} variant="edit" title="Edit group"><IconPencil size={14} /></IconButton>
                              <IconButton onClick={() => deleteGroupMut.mutate(g.id)} variant="delete" title="Delete group"><IconTrash size={14} /></IconButton>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {members.map(m => (
                              <div key={m.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-divider)]">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: avatarColor(m.name).bg, color: avatarColor(m.name).text }}>
                                  {m.name[0].toUpperCase()}
                                </div>
                                <span className="text-xs text-[var(--color-chip-text)]">{m.name}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </PageContainer>
    </div>
  )
}
