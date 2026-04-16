import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  listContacts, createContact, updateContact, deleteContact,
  listGroups, createGroup, updateGroup, deleteGroup,
  type Contact, type ContactGroup,
} from '../../api/contacts'
import { avatarColor } from '../../utils/avatar'
import { IconPencil, IconTrash, iconBtnEdit, iconBtnDelete } from '../../utils/icons'

const inputClass = 'w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm text-[#1d1d1f] bg-[#f9f9f9] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:bg-white transition-all placeholder-[#aeaeb2]'

export default function ContactsPage() {
  const qc = useQueryClient()
  const { data: contacts = [] } = useQuery({ queryKey: ['contacts'], queryFn: listContacts })
  const { data: groups = [] } = useQuery({ queryKey: ['contact-groups'], queryFn: listGroups })

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

  const addContactMut = useMutation({
    mutationFn: ({ name, note }: { name: string; note?: string }) => createContact(name, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setNewName(''); setNewNote('') },
  })
  const updateContactMut = useMutation({
    mutationFn: ({ id, name, note }: { id: string; name: string; note?: string }) => updateContact(id, { name, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setEditingId(null) },
  })
  const deleteContactMut = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
  const addGroupMut = useMutation({
    mutationFn: ({ name, member_ids }: { name: string; member_ids: string[] }) => createGroup(name, member_ids),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contact-groups'] }); setNewGroupName(''); setNewGroupMembers([]) },
  })
  const updateGroupMut = useMutation({
    mutationFn: ({ id, name, member_ids }: { id: string; name: string; member_ids: string[] }) => updateGroup(id, { name, member_ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contact-groups'] }); setEditingGroupId(null) },
  })
  const deleteGroupMut = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-groups'] }),
  })

  const filteredContacts = contacts
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const toggleMember = (id: string, members: string[], setMembers: (m: string[]) => void) =>
    setMembers(members.includes(id) ? members.filter(m => m !== id) : [...members, id])

  return (
    <div>
      <div className="bg-white border-b border-[#e8e8ed] px-8 py-5 sticky top-0 z-10">
        <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Contacts</h1>
      </div>

      <div className="px-8 py-8 max-w-3xl mx-auto space-y-5">

        {/* Tab switcher */}
        <div className="flex bg-[#f2f2f7] rounded-xl p-1">
          {(['contacts', 'groups'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium border-none cursor-pointer transition-all ${tab === t ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'bg-transparent text-[#6e6e73]'}`}>
              {t === 'contacts' ? `People (${contacts.length})` : `Groups (${groups.length})`}
            </button>
          ))}
        </div>

        {/* ── CONTACTS TAB ── */}
        {tab === 'contacts' && (
          <>
            {/* Add contact */}
            <div className="bg-white rounded-2xl border border-[#e8e8ed] p-5">
              <p className="text-xs font-semibold text-[#86868b] uppercase tracking-widest mb-3">Add contact</p>
              <div className="flex gap-2">
                <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && newName.trim() && addContactMut.mutate({ name: newName.trim(), note: newNote.trim() || undefined })} placeholder="Name" autoFocus className={inputClass} />
                <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && newName.trim() && addContactMut.mutate({ name: newName.trim(), note: newNote.trim() || undefined })} placeholder="Note (optional)" className={inputClass} />
                <button onClick={() => newName.trim() && addContactMut.mutate({ name: newName.trim(), note: newNote.trim() || undefined })} disabled={!newName.trim() || addContactMut.isPending} className="bg-[#0071e3] text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[#0077ed] transition-colors shrink-0">
                  Add
                </button>
              </div>
            </div>

            {/* Search */}
            {contacts.length > 4 && (
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className={inputClass} />
            )}

            {/* List */}
            {filteredContacts.length === 0 ? (
              <div className="text-center py-10 text-[#86868b] text-sm">
                {contacts.length === 0 ? 'No contacts yet. Add your first one above.' : 'No matches found.'}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden divide-y divide-[#f2f2f7]">
                {filteredContacts.map(c => (
                  <div key={c.id}>
                    {editingId === c.id ? (
                      <div className="px-4 py-3 flex items-center gap-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateContactMut.mutate({ id: c.id, name: editName.trim(), note: editNote.trim() || undefined })} autoFocus className="flex-1 border border-[#0071e3] rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white" />
                        <input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Note" className="flex-1 border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] bg-[#f9f9f9]" />
                        <button onClick={() => updateContactMut.mutate({ id: c.id, name: editName.trim(), note: editNote.trim() || undefined })} className="bg-[#0071e3] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0077ed] transition-colors shrink-0">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-[#86868b] text-sm px-3 py-2 hover:text-[#1d1d1f] transition-colors shrink-0">Cancel</button>
                      </div>
                    ) : (
                      <div className="px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: avatarColor(c.name).bg, color: avatarColor(c.name).text }}>
                          {c.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1d1d1f]">{c.name}</p>
                          {c.note && <p className="text-xs text-[#86868b]">{c.note}</p>}
                        </div>
                        <button onClick={() => { setEditingId(c.id); setEditName(c.name); setEditNote(c.note || '') }} className={iconBtnEdit} title="Edit"><IconPencil /></button>
                        <button onClick={() => deleteContactMut.mutate(c.id)} className={iconBtnDelete} title="Remove"><IconTrash /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── GROUPS TAB ── */}
        {tab === 'groups' && (
          <>
            <div className="bg-white rounded-2xl border border-[#e8e8ed] p-5">
              <p className="text-xs font-semibold text-[#86868b] uppercase tracking-widest mb-3">Create group</p>
              {contacts.length === 0 ? (
                <p className="text-sm text-[#86868b]">Add contacts first before creating groups.</p>
              ) : (
                <>
                  <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name (e.g. Roommates, Family)" className={`${inputClass} mb-3`} />
                  <p className="text-xs text-[#86868b] mb-2">Select members:</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {contacts.map(c => {
                      const on = newGroupMembers.includes(c.id)
                      return (
                        <button key={c.id} onClick={() => toggleMember(c.id, newGroupMembers, setNewGroupMembers)} className="px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-all" style={{ background: on ? avatarColor(c.name).bg : '#f2f2f7', color: on ? avatarColor(c.name).text : '#3a3a3c' }}>
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                  <button onClick={() => newGroupName.trim() && newGroupMembers.length > 0 && addGroupMut.mutate({ name: newGroupName.trim(), member_ids: newGroupMembers })} disabled={!newGroupName.trim() || newGroupMembers.length === 0 || addGroupMut.isPending} className="bg-[#0071e3] text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[#0077ed] transition-colors">
                    Create group
                  </button>
                </>
              )}
            </div>

            {groups.length === 0 ? (
              <div className="text-center py-10 text-[#86868b] text-sm">No groups yet.</div>
            ) : (
              <div className="space-y-3">
                {groups.map(g => {
                  const members = g.member_ids.map(id => contacts.find(c => c.id === id)).filter(Boolean) as Contact[]
                  return (
                    <div key={g.id} className="bg-white rounded-2xl border border-[#e8e8ed] p-5">
                      {editingGroupId === g.id ? (
                        <>
                          <input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} autoFocus className={`${inputClass} mb-3 border-[#0071e3]`} />
                          <div className="flex flex-wrap gap-2 mb-3">
                            {contacts.map(c => {
                              const on = editGroupMembers.includes(c.id)
                              return (
                                <button key={c.id} onClick={() => toggleMember(c.id, editGroupMembers, setEditGroupMembers)} className="px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-all" style={{ background: on ? avatarColor(c.name).bg : '#f2f2f7', color: on ? avatarColor(c.name).text : '#3a3a3c' }}>
                                  {c.name}
                                </button>
                              )
                            })}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateGroupMut.mutate({ id: g.id, name: editGroupName.trim(), member_ids: editGroupMembers })} className="bg-[#0071e3] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#0077ed] transition-colors">Save</button>
                            <button onClick={() => setEditingGroupId(null)} className="text-[#86868b] text-sm px-4 py-2.5 hover:text-[#1d1d1f] transition-colors">Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-[#1d1d1f]">{g.name}</p>
                              <p className="text-xs text-[#86868b]">{members.length} {members.length === 1 ? 'person' : 'people'}</p>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => { setEditingGroupId(g.id); setEditGroupName(g.name); setEditGroupMembers(g.member_ids) }} className={iconBtnEdit} title="Edit group"><IconPencil /></button>
                              <button onClick={() => deleteGroupMut.mutate(g.id)} className={iconBtnDelete} title="Delete group"><IconTrash /></button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {members.map(m => (
                              <div key={m.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f2f2f7]">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: avatarColor(m.name).bg, color: avatarColor(m.name).text }}>
                                  {m.name[0].toUpperCase()}
                                </div>
                                <span className="text-[13px] text-[#3a3a3c]">{m.name}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
