import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Contact = {
  id: string
  name: string
  note?: string
}

export type ContactGroup = {
  id: string
  name: string
  memberIds: string[]
}

type ContactsStore = {
  contacts: Contact[]
  groups: ContactGroup[]
  addContact: (name: string, note?: string) => Contact
  updateContact: (id: string, changes: Partial<Contact>) => void
  removeContact: (id: string) => void
  addGroup: (name: string, memberIds: string[]) => ContactGroup
  updateGroup: (id: string, changes: Partial<ContactGroup>) => void
  removeGroup: (id: string) => void
}

function genId() { return Math.random().toString(36).slice(2, 10) }

export const useContactsStore = create<ContactsStore>()(
  persist(
    (set) => ({
      contacts: [],
      groups: [],

      addContact: (name, note) => {
        const contact: Contact = { id: genId(), name: name.trim(), note }
        set(s => ({ contacts: [...s.contacts, contact] }))
        return contact
      },

      updateContact: (id, changes) =>
        set(s => ({ contacts: s.contacts.map(c => c.id === id ? { ...c, ...changes } : c) })),

      removeContact: (id) =>
        set(s => ({
          contacts: s.contacts.filter(c => c.id !== id),
          groups: s.groups.map(g => ({ ...g, memberIds: g.memberIds.filter(m => m !== id) }))
        })),

      addGroup: (name, memberIds) => {
        const group: ContactGroup = { id: genId(), name: name.trim(), memberIds }
        set(s => ({ groups: [...s.groups, group] }))
        return group
      },

      updateGroup: (id, changes) =>
        set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, ...changes } : g) })),

      removeGroup: (id) =>
        set(s => ({ groups: s.groups.filter(g => g.id !== id) })),
    }),
    { name: 'splitit-contacts' }
  )
)
