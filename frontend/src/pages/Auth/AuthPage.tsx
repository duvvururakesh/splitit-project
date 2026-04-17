import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { guestLogin, login, register, forgotPassword, resetPassword } from '../../api/auth'
import { useAuthStore } from '../../store/auth.store'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { IconReceipt, IconUser } from '../../utils/icons'

type Mode = 'landing' | 'signin' | 'register' | 'forgot' | 'reset'

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setGuestToken, setToken } = useAuthStore()

  const [mode, setMode] = useState<Mode>(() => searchParams.get('reset_token') ? 'reset' : 'landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState(searchParams.get('reset_token') || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reset = (m: Mode) => { setMode(m); setError(''); setSuccess('') }

  const handleGuest = async () => {
    setLoading(true); setError('')
    try {
      const data = await guestLogin()
      setGuestToken(data.access_token)
      navigate('/split')
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const data = await login(email, password)
      setToken(data.access_token)
      navigate('/split')
    } catch (err: any) { setError(err?.response?.data?.detail || 'Invalid email or password') }
    finally { setLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) { setError("Passwords do not match"); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    try {
      const data = await register(email, password, name)
      setToken(data.access_token)
      navigate('/split')
    } catch (err: any) { setError(err?.response?.data?.detail || 'Registration failed') }
    finally { setLoading(false) }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('')
    try {
      await forgotPassword(email)
      setSuccess('Check your email for a reset link. During development, check backend logs for token.')
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) { setError("Passwords do not match"); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    try {
      await resetPassword(resetToken, newPassword)
      setSuccess('Password updated! You can now sign in.')
      setTimeout(() => reset('signin'), 2000)
    } catch (err: any) { setError(err?.response?.data?.detail || 'Reset link is invalid or expired') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[var(--color-apple-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-apple-blue)] mb-4 text-white">
            <IconReceipt size={24} />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-apple-text)] tracking-tight">Splitit</h1>
          <p className="text-sm text-[var(--color-apple-tertiary)] mt-1">Split bills without the awkward math</p>
        </div>

        <Card className="overflow-hidden shadow-sm">
          {mode === 'landing' && (
            <div className="p-6 space-y-3">
              <Button onClick={handleGuest} disabled={loading} variant="secondary" className="w-full">
                {loading ? 'Starting...' : (<><IconUser size={15} />Continue as Guest</>)}
              </Button>
              <p className="text-xs text-center text-[var(--color-caption)]">Guest sessions are temporary and will be lost when the tab closes</p>
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-[var(--color-card-border)]" />
                <span className="text-xs text-[var(--color-caption)]">or</span>
                <div className="flex-1 h-px bg-[var(--color-card-border)]" />
              </div>
              <Button onClick={() => reset('signin')} className="w-full">Sign in</Button>
              <Button onClick={() => reset('register')} variant="ghost" className="w-full border border-[var(--color-apple-blue)] text-[var(--color-apple-blue)] hover:bg-[var(--color-apple-blue-tint-2)]">Create account</Button>
              {error && <p className="text-xs text-[var(--color-apple-red)] text-center">{error}</p>}
            </div>
          )}

          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="p-6 space-y-3">
              <h2 className="text-base font-semibold text-[var(--color-apple-text)] mb-4">Sign in</h2>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoFocus className="bg-white" />
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="bg-white" />
              <div className="text-right">
                <button type="button" onClick={() => reset('forgot')} className="text-xs text-[var(--color-apple-blue)] border-none bg-transparent cursor-pointer hover:underline p-0">Forgot password?</button>
              </div>
              {error && <p className="text-xs text-[var(--color-apple-red)]">{error}</p>}
              <Button type="submit" disabled={loading || !email || !password} className="w-full">{loading ? 'Signing in...' : 'Sign in'}</Button>
              <Button type="button" onClick={() => reset('landing')} variant="ghost" className="w-full">Back</Button>
              <p className="text-xs text-center text-[var(--color-apple-tertiary)]">No account? <button type="button" onClick={() => reset('register')} className="text-[var(--color-apple-blue)] border-none bg-transparent cursor-pointer hover:underline p-0 text-xs">Create one</button></p>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="p-6 space-y-3">
              <h2 className="text-base font-semibold text-[var(--color-apple-text)] mb-4">Create account</h2>
              <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required autoFocus className="bg-white" />
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="bg-white" />
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 characters)" required className="bg-white" />
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" required className="bg-white" />
              {error && <p className="text-xs text-[var(--color-apple-red)]">{error}</p>}
              <Button type="submit" disabled={loading || !name || !email || !password || !confirmPassword} className="w-full">{loading ? 'Creating account...' : 'Create account'}</Button>
              <Button type="button" onClick={() => reset('landing')} variant="ghost" className="w-full">Back</Button>
              <p className="text-xs text-center text-[var(--color-apple-tertiary)]">Already have an account? <button type="button" onClick={() => reset('signin')} className="text-[var(--color-apple-blue)] border-none bg-transparent cursor-pointer hover:underline p-0 text-xs">Sign in</button></p>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="p-6 space-y-3">
              <h2 className="text-base font-semibold text-[var(--color-apple-text)]">Reset password</h2>
              <p className="text-xs text-[var(--color-apple-tertiary)]">Enter your email and we will send you a reset link.</p>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoFocus className="bg-white" />
              {error && <p className="text-xs text-[var(--color-apple-red)]">{error}</p>}
              {success && <p className="text-xs text-[var(--color-apple-green)]">{success}</p>}
              {!success && <Button type="submit" disabled={loading || !email} className="w-full">{loading ? 'Sending...' : 'Send reset link'}</Button>}
              {success && <Button type="button" onClick={() => reset('reset')} variant="secondary" className="w-full">Enter reset token</Button>}
              <Button type="button" onClick={() => reset('signin')} variant="ghost" className="w-full">Back to sign in</Button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="p-6 space-y-3">
              <h2 className="text-base font-semibold text-[var(--color-apple-text)]">Set new password</h2>
              <Input type="text" value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="Paste reset token here" required autoFocus className="bg-white" />
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" required className="bg-white" />
              <Input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" required className="bg-white" />
              {error && <p className="text-xs text-[var(--color-apple-red)]">{error}</p>}
              {success && <p className="text-xs text-[var(--color-apple-green)] font-medium">{success}</p>}
              <Button type="submit" disabled={loading || !resetToken || !newPassword || !confirmNewPassword} className="w-full">{loading ? 'Updating...' : 'Update password'}</Button>
              <Button type="button" onClick={() => reset('signin')} variant="ghost" className="w-full">Back to sign in</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
