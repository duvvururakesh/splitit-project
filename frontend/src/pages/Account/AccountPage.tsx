import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getMe, logoutAllApi, logoutApi, updateMe } from '../../api/auth'
import { useAuthStore } from '../../store/auth.store'
import { avatarColor } from '../../utils/avatar'
import { IconPencil, IconTrash } from '../../utils/icons'
import PageHeader from '../../components/ui/PageHeader'
import PageContainer from '../../components/ui/PageContainer'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import Input from '../../components/ui/Input'

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
    logoutApi()
      .catch(() => undefined)
      .finally(() => {
        logout()
        queryClient.clear()
        navigate('/auth')
      })
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-[var(--color-apple-tertiary)] text-sm">Loading...</div>
  if (isError || !user) return <div className="flex items-center justify-center h-64 text-[var(--color-apple-tertiary)] text-sm">Could not load account info.</div>

  const name = user?.display_name || ''
  const color = avatarColor(name)

  return (
    <div>
      <PageHeader title="Account" />

      <PageContainer className="space-y-5">
        {isGuest && (
          <Card className="bg-[var(--color-apple-caution-bg)] border-[var(--color-apple-caution-border)] px-5 py-4 flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-apple-caution-text)]">You're using a guest session</p>
              <p className="text-xs text-[var(--color-apple-caution-subtext)] mt-0.5">Your data will be lost when you close this tab. Create an account to save your splits.</p>
              <Button
                onClick={() => { logout(); queryClient.clear(); navigate('/auth') }}
                className="mt-3"
              >
                Create account
              </Button>
            </div>
          </Card>
        )}

        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0" style={{ background: color.bg, color: color.text }}>
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--color-apple-text)]">{name}</p>
            {!isGuest && <p className="text-sm text-[var(--color-apple-tertiary)]">{user?.email}</p>}
            {isGuest && <p className="text-sm text-[var(--color-apple-tertiary)]">Guest session</p>}
          </div>
        </div>

        {!isGuest && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-divider)]">
              <p className="text-xs font-semibold text-[var(--color-apple-tertiary)] uppercase tracking-widest">Profile</p>
              {!profileEditing && (
                <IconButton onClick={() => { setDisplayName(user?.display_name || ''); setEmail(user?.email || ''); setProfileEditing(true) }} variant="edit" title="Edit profile">
                  <IconPencil size={14} />
                </IconButton>
              )}
            </div>

            {profileEditing ? (
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-xs text-[var(--color-apple-tertiary)] mb-1 block">Display name</label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} autoFocus className="bg-white" />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-apple-tertiary)] mb-1 block">Email</label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="bg-white" />
                </div>
                {updateMutation.isError && (
                  <p className="text-xs text-[var(--color-apple-red)]">{(updateMutation.error as any)?.response?.data?.detail || 'Failed to update'}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => {
                    const c: any = {}
                    if (displayName.trim() !== user?.display_name) c.display_name = displayName.trim()
                    if (email.trim() !== user?.email) c.email = email.trim()
                    if (Object.keys(c).length) updateMutation.mutate(c)
                    else setProfileEditing(false)
                  }} disabled={updateMutation.isPending || !displayName.trim()}>
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button onClick={() => setProfileEditing(false)} variant="ghost">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-divider)]">
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-[var(--color-apple-tertiary)]">Name</span>
                  <span className="text-sm font-medium text-[var(--color-apple-text)]">{user?.display_name}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-[var(--color-apple-tertiary)]">Email</span>
                  <span className="text-sm font-medium text-[var(--color-apple-text)]">{user?.email}</span>
                </div>
              </div>
            )}
          </Card>
        )}

        {!isGuest && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-divider)]">
              <p className="text-xs font-semibold text-[var(--color-apple-tertiary)] uppercase tracking-widest">Password</p>
              {!passwordEditing && (
                <IconButton onClick={() => setPasswordEditing(true)} variant="edit" title="Change password">
                  <IconPencil size={14} />
                </IconButton>
              )}
            </div>

            {passwordEditing ? (
              <div className="p-5 space-y-3">
                <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" autoFocus className="bg-white" />
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="bg-white" />
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="bg-white" />
                {newPassword && confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-[var(--color-apple-red)]">Passwords do not match</p>}
                {newPassword.length > 0 && newPassword.length < 6 && <p className="text-xs text-[var(--color-apple-red)]">At least 6 characters required</p>}
                {passwordMutation.isError && <p className="text-xs text-[var(--color-apple-red)]">{(passwordMutation.error as any)?.response?.data?.detail || 'Failed to update password'}</p>}
                {passwordMutation.isSuccess && <p className="text-xs text-[var(--color-apple-green)] font-medium">Password updated</p>}
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => passwordMutation.mutate({ current_password: currentPassword, new_password: newPassword })}
                    disabled={passwordMutation.isPending || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                  >
                    {passwordMutation.isPending ? 'Saving...' : 'Update password'}
                  </Button>
                  <Button onClick={() => { setPasswordEditing(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }} variant="ghost">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-3.5">
                <span className="text-sm text-[var(--color-caption)]">••••••••</span>
              </div>
            )}
          </Card>
        )}

        <Card className="overflow-hidden">
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-[var(--color-apple-red)] hover:text-[var(--color-apple-red)] hover:bg-[var(--color-apple-danger-bg)] rounded-none px-5 py-4">
            <IconTrash size={16} />
            {isGuest ? 'End guest session' : 'Sign out (this device)'}
          </Button>
          {!isGuest && (
            <Button
              onClick={() => {
                logoutAllApi()
                  .catch(() => undefined)
                  .finally(() => {
                    logout()
                    queryClient.clear()
                    navigate('/auth')
                  })
              }}
              variant="ghost"
              className="w-full justify-start rounded-none px-5 py-4 border-t border-[var(--color-divider)]"
            >
              Sign out all devices
            </Button>
          )}
        </Card>
      </PageContainer>
    </div>
  )
}
