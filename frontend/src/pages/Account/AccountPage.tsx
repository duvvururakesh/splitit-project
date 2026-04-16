import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getMe, updateMe } from '../../api/auth'
import { useAuthStore } from '../../store/auth.store'
import { avatarColor } from '../../utils/avatar'
import { IconPencil, iconBtnEdit } from '../../utils/icons'

export default function AccountPage() {
  const navigate = useNavigate()
  const { logout, isGuest } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: user, isLoading, isError } = useQuery({ queryKey: ['me'], queryFn: getMe })

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [profileEditing, setProfileEditing] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordEditing, setPasswordEditing] = useState(false)

  const updateMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['me'] }); setProfileEditing(false) },
  })

  const passwordMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: () => { setPasswordEditing(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') },
  })

  const handleLogout = () => {
    logout()
    queryClient.clear()
    navigate('/auth')
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-[#86868b] text-sm">Loading…</div>
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

        {/* Guest banner */}
        {isGuest && (
          <div className="bg-[#fff9e6] border border-[#ffd60a] rounded-2xl px-5 py-4 flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#7a5c00]">You're using a guest session</p>
              <p className="text-xs text-[#a07800] mt-0.5">Your data will be lost when you close this tab. Create an account to save your splits.</p>
              <button
                onClick={() => { logout(); queryClient.clear(); navigate('/auth') }}
                className="mt-3 bg-[#0071e3] text-white text-xs font-medium px-4 py-2 rounded-xl border-none cursor-pointer hover:bg-[#0077ed] transition-colors"
              >
                Create account
              </button>
            </div>
          </div>
        )}

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
            {!isGuest && <p className="text-sm text-[#86868b]">{user?.email}</p>}
            {isGuest && <p className="text-sm text-[#86868b]">Guest session</p>}
          </div>
        </div>

        {/* Profile info — only for real accounts */}
        {!isGuest && (
          <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2f2f7]">
              <p className="text-xs font-semibold text-[#86868b] uppercase tracking-widest">Profile</p>
              {!profileEditing && (
                <button onClick={() => { setDisplayName(user?.display_name || ''); setEmail(user?.email || ''); setProfileEditing(true) }} className={iconBtnEdit} title="Edit profile">
                  <IconPencil />
                </button>
              )}
            </div>

            {profileEditing ? (
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-xs text-[#86868b] mb-1 block">Display name</label>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)} autoFocus className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                </div>
                <div>
                  <label className="text-xs text-[#86868b] mb-1 block">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                </div>
                {updateMutation.isError && (
                  <p className="text-xs text-[#ff3b30]">{(updateMutation.error as any)?.response?.data?.detail || 'Failed to update'}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { const c: any = {}; if (displayName.trim() !== user?.display_name) c.display_name = displayName.trim(); if (email.trim() !== user?.email) c.email = email.trim(); if (Object.keys(c).length) updateMutation.mutate(c); else setProfileEditing(false) }} disabled={updateMutation.isPending || !displayName.trim()} className="bg-[#0071e3] text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[#0077ed] transition-colors">
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
        )}

        {/* Password — only for real accounts */}
        {!isGuest && (
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
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" autoFocus className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                {newPassword && confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-[#ff3b30]">Passwords don't match</p>}
                {newPassword.length > 0 && newPassword.length < 6 && <p className="text-xs text-[#ff3b30]">At least 6 characters required</p>}
                {passwordMutation.isError && <p className="text-xs text-[#ff3b30]">{(passwordMutation.error as any)?.response?.data?.detail || 'Failed to update password'}</p>}
                {passwordMutation.isSuccess && <p className="text-xs text-[#34c759] font-medium">✓ Password updated</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => passwordMutation.mutate({ current_password: currentPassword, new_password: newPassword })} disabled={passwordMutation.isPending || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword} className="bg-[#0071e3] text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[#0077ed] transition-colors">
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
        )}

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-[#ff3b30] hover:bg-[#fff2f2] transition-colors text-left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {isGuest ? 'End guest session' : 'Sign out'}
          </button>
        </div>

      </div>
    </div>
  )
}
