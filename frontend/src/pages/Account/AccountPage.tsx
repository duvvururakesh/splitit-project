import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getMe, updateMe } from '../../api/auth'
import { useAuthStore } from '../../store/auth.store'
import { avatarColor } from '../../utils/avatar'
import { IconPencil, iconBtnEdit } from '../../utils/icons'

export default function AccountPage() {
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  const queryClient = useQueryClient()

  const { data: user, isLoading, isError } = useQuery({ queryKey: ['me'], queryFn: getMe })

  // Profile fields
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [profileEditing, setProfileEditing] = useState(false)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordEditing, setPasswordEditing] = useState(false)

  const updateMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setProfileEditing(false)
    },
  })

  const passwordMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: () => {
      setPasswordEditing(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
  })

  const startEditProfile = () => {
    setDisplayName(user?.display_name || '')
    setEmail(user?.email || '')
    setProfileEditing(true)
  }

  const saveProfile = () => {
    const changes: any = {}
    if (displayName.trim() !== user?.display_name) changes.display_name = displayName.trim()
    if (email.trim() !== user?.email) changes.email = email.trim()
    if (Object.keys(changes).length === 0) { setProfileEditing(false); return }
    updateMutation.mutate(changes)
  }

  const savePassword = () => {
    if (newPassword !== confirmPassword) return
    if (newPassword.length < 6) return
    passwordMutation.mutate({ current_password: currentPassword, new_password: newPassword })
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-[#86868b] text-sm">Loading...</div>
  if (isError || !user) return <div className="flex items-center justify-center h-64 text-[#86868b] text-sm">Could not load account info.</div>

  const name = user?.display_name || ''
  const color = avatarColor(name)

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8ed] px-8 py-5 sticky top-0 z-10">
        <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Account</h1>
      </div>

      <div className="px-8 py-8 max-w-3xl mx-auto space-y-5">

        {/* Avatar + name */}
        <div className="flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
            style={{ background: color.bg, color: color.text }}
          >
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-[#1d1d1f]">{name}</p>
            <p className="text-sm text-[#86868b]">{user?.email}</p>
          </div>
        </div>

        {/* Profile info */}
        <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2f2f7]">
            <p className="text-xs font-semibold text-[#86868b] uppercase tracking-widest">Profile</p>
            {!profileEditing && (
              <button onClick={startEditProfile} className={iconBtnEdit} title="Edit profile">
                <IconPencil />
              </button>
            )}
          </div>

          {profileEditing ? (
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-[#86868b] mb-1 block">Display name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  autoFocus
                  className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="text-xs text-[#86868b] mb-1 block">Email</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              {updateMutation.isError && (
                <p className="text-xs text-[#ff3b30]">{(updateMutation.error as any)?.response?.data?.detail || 'Failed to update'}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveProfile}
                  disabled={updateMutation.isPending || !displayName.trim()}
                  className="bg-[#0071e3] text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[#0077ed] transition-colors"
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setProfileEditing(false)} className="text-sm text-[#86868b] px-4 py-2.5 hover:text-[#1d1d1f] transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#f2f2f7]">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-[#86868b]">Name</span>
                <span className="text-sm font-medium text-[#1d1d1f]">{user?.display_name}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-[#86868b]">Email</span>
                <span className="text-sm font-medium text-[#1d1d1f]">{user?.email}</span>
              </div>
            </div>
          )}
        </div>

        {/* Password */}
        <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2f2f7]">
            <p className="text-xs font-semibold text-[#86868b] uppercase tracking-widest">Password</p>
            {!passwordEditing && (
              <button onClick={() => setPasswordEditing(true)} className={iconBtnEdit} title="Change password">
                <IconPencil />
              </button>
            )}
          </div>

          {passwordEditing ? (
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-[#86868b] mb-1 block">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoFocus
                  className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="text-xs text-[#86868b] mb-1 block">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="text-xs text-[#86868b] mb-1 block">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-[#ff3b30]">Passwords don't match</p>
              )}
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-[#ff3b30]">At least 6 characters required</p>
              )}
              {passwordMutation.isError && (
                <p className="text-xs text-[#ff3b30]">{(passwordMutation.error as any)?.response?.data?.detail || 'Failed to update password'}</p>
              )}
              {passwordMutation.isSuccess && (
                <p className="text-xs text-[#34c759] font-medium">✓ Password updated</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={savePassword}
                  disabled={passwordMutation.isPending || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="bg-[#0071e3] text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[#0077ed] transition-colors"
                >
                  {passwordMutation.isPending ? 'Saving…' : 'Update password'}
                </button>
                <button onClick={() => { setPasswordEditing(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }} className="text-sm text-[#86868b] px-4 py-2.5 hover:text-[#1d1d1f] transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3.5">
              <span className="text-sm text-[#aeaeb2]">••••••••</span>
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
          <button
            onClick={() => { logout(); navigate('/auth') }}
            className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-[#ff3b30] hover:bg-[#fff2f2] transition-colors text-left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>

      </div>
    </div>
  )
}
