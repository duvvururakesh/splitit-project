import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { guestLogin, login, register, forgotPassword, resetPassword } from '../../api/auth'
import { useAuthStore } from '../../store/auth.store'

type Mode = 'landing' | 'signin' | 'register' | 'forgot' | 'reset'

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setGuestToken, setToken } = useAuthStore()

  const [mode, setMode] = useState<Mode>(() => {
    return searchParams.get('reset_token') ? 'reset' : 'landing'
  })

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
    if (password !== confirmPassword) { setError("Passwords don't match"); return }
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
      setSuccess('Check your email for a reset link. (During development, check the backend console for the token.)')
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) { setError("Passwords don't match"); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    try {
      await resetPassword(resetToken, newPassword)
      setSuccess('Password updated! You can now sign in.')
      setTimeout(() => reset('signin'), 2000)
    } catch (err: any) { setError(err?.response?.data?.detail || 'Reset link is invalid or expired') }
    finally { setLoading(false) }
  }

  const inputClass = 'w-full border border-[#d2d2d7] rounded-xl px-4 py-3 text-sm text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] placeholder-[#aeaeb2]'

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0071e3] mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="18" rx="2"/>
              <line x1="8" y1="9" x2="16" y2="9"/>
              <line x1="8" y1="13" x2="16" y2="13"/>
              <line x1="8" y1="17" x2="12" y2="17"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Splitit</h1>
          <p className="text-sm text-[#86868b] mt-1">Split bills without the awkward math</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden shadow-sm">

          {/* LANDING */}
          {mode === 'landing' && (
            <div className="p-6 space-y-3">
              <button onClick={handleGuest} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-[#f2f2f7] text-[#1d1d1f] text-sm font-medium px-4 py-3.5 rounded-xl border-none cursor-pointer hover:bg-[#e8e8ed] transition-colors disabled:opacity-50">
                {loading ? 'Starting…' : (<>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Continue as Guest
                </>)}
              </button>
              <p className="text-xs text-center text-[#aeaeb2]">Guest sessions are temporary — data is lost when you close the tab</p>
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-[#e8e8ed]"/>
                <span className="text-xs text-[#aeaeb2]">or</span>
                <div className="flex-1 h-px bg-[#e8e8ed]"/>
              </div>
              <button onClick={() => reset('signin')} className="w-full bg-[#0071e3] text-white text-sm font-medium px-4 py-3.5 rounded-xl border-none cursor-pointer hover:bg-[#0077ed] transition-colors">Sign in</button>
              <button onClick={() => reset('register')} className="w-full bg-white text-[#0071e3] text-sm font-medium px-4 py-3.5 rounded-xl border border-[#0071e3] cursor-pointer hover:bg-[#f0f7ff] transition-colors">Create account</button>
              {error && <p className="text-xs text-[#ff3b30] text-center">{error}</p>}
            </div>
          )}

          {/* SIGN IN */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="p-6 space-y-3">
              <h2 className="text-base font-semibold text-[#1d1d1f] mb-4">Sign in</h2>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoFocus className={inputClass} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className={inputClass} />
              <div className="text-right">
                <button type="button" onClick={() => reset('forgot')} className="text-xs text-[#0071e3] border-none bg-transparent cursor-pointer hover:underline p-0">
                  Forgot password?
                </button>
              </div>
              {error && <p className="text-xs text-[#ff3b30]">{error}</p>}
              <button type="submit" disabled={loading || !email || !password} className="w-full bg-[#0071e3] text-white text-sm font-medium px-4 py-3.5 rounded-xl border-none cursor-pointer hover:bg-[#0077ed] transition-colors disabled:opacity-40">
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <button type="button" onClick={() => reset('landing')} className="w-full text-sm text-[#86868b] py-2 hover:text-[#1d1d1f] transition-colors border-none bg-transparent cursor-pointer">← Back</button>
              <p className="text-xs text-center text-[#86868b]">No account?{' '}<button type="button" onClick={() => reset('register')} className="text-[#0071e3] border-none bg-transparent cursor-pointer hover:underline p-0 text-xs">Create one</button></p>
            </form>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="p-6 space-y-3">
              <h2 className="text-base font-semibold text-[#1d1d1f] mb-4">Create account</h2>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required autoFocus className={inputClass} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className={inputClass} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 characters)" required className={inputClass} />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" required className={inputClass} />
              {error && <p className="text-xs text-[#ff3b30]">{error}</p>}
              <button type="submit" disabled={loading || !name || !email || !password || !confirmPassword} className="w-full bg-[#0071e3] text-white text-sm font-medium px-4 py-3.5 rounded-xl border-none cursor-pointer hover:bg-[#0077ed] transition-colors disabled:opacity-40">
                {loading ? 'Creating account…' : 'Create account'}
              </button>
              <button type="button" onClick={() => reset('landing')} className="w-full text-sm text-[#86868b] py-2 hover:text-[#1d1d1f] transition-colors border-none bg-transparent cursor-pointer">← Back</button>
              <p className="text-xs text-center text-[#86868b]">Already have an account?{' '}<button type="button" onClick={() => reset('signin')} className="text-[#0071e3] border-none bg-transparent cursor-pointer hover:underline p-0 text-xs">Sign in</button></p>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="p-6 space-y-3">
              <h2 className="text-base font-semibold text-[#1d1d1f]">Reset password</h2>
              <p className="text-xs text-[#86868b]">Enter your email and we'll send you a reset link.</p>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoFocus className={inputClass} />
              {error && <p className="text-xs text-[#ff3b30]">{error}</p>}
              {success && <p className="text-xs text-[#34c759]">{success}</p>}
              {!success && (
                <button type="submit" disabled={loading || !email} className="w-full bg-[#0071e3] text-white text-sm font-medium px-4 py-3.5 rounded-xl border-none cursor-pointer hover:bg-[#0077ed] transition-colors disabled:opacity-40">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              )}
              {success && (
                <button type="button" onClick={() => reset('reset')} className="w-full bg-[#f2f2f7] text-[#1d1d1f] text-sm font-medium px-4 py-3.5 rounded-xl border-none cursor-pointer hover:bg-[#e8e8ed] transition-colors">
                  Enter reset token
                </button>
              )}
              <button type="button" onClick={() => reset('signin')} className="w-full text-sm text-[#86868b] py-2 hover:text-[#1d1d1f] transition-colors border-none bg-transparent cursor-pointer">← Back to sign in</button>
            </form>
          )}

          {/* RESET PASSWORD */}
          {mode === 'reset' && (
            <form onSubmit={handleReset} className="p-6 space-y-3">
              <h2 className="text-base font-semibold text-[#1d1d1f]">Set new password</h2>
              <input type="text" value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="Paste reset token here" required autoFocus className={inputClass} />
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" required className={inputClass} />
              <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" required className={inputClass} />
              {error && <p className="text-xs text-[#ff3b30]">{error}</p>}
              {success && <p className="text-xs text-[#34c759] font-medium">{success}</p>}
              <button type="submit" disabled={loading || !resetToken || !newPassword || !confirmNewPassword} className="w-full bg-[#0071e3] text-white text-sm font-medium px-4 py-3.5 rounded-xl border-none cursor-pointer hover:bg-[#0077ed] transition-colors disabled:opacity-40">
                {loading ? 'Updating…' : 'Update password'}
              </button>
              <button type="button" onClick={() => reset('signin')} className="w-full text-sm text-[#86868b] py-2 hover:text-[#1d1d1f] transition-colors border-none bg-transparent cursor-pointer">← Back to sign in</button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
