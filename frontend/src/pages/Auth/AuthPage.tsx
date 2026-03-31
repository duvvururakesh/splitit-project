import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'
import { useAuthStore } from '../../store/auth.store'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  display_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone_number: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

const inputClass = `w-full border border-[#d2d2d7] rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f]
  placeholder-[#aeaeb2] bg-[#f9f9f9] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent focus:bg-white
  transition-all`

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const setToken = useAuthStore((s) => s.setToken)
  const navigate = useNavigate()

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const onLogin = async (data: LoginForm) => {
    setError('')
    try {
      const res = await client.post('/auth/login', data)
      setToken(res.data.access_token)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    }
  }

  const onRegister = async (data: RegisterForm) => {
    setError('')
    try {
      const res = await client.post('/auth/register', data)
      setToken(res.data.access_token)
      navigate('/')
    } catch {
      setError('Could not create account. Email may already be in use.')
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4 py-6">
      <div className="bg-white rounded-[20px] border border-[#e8e8ed] w-full max-w-[400px] px-9 py-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-[-0.5px] m-0">Splitit</h1>
          <p className="text-[#86868b] text-[15px] mt-1.5 mb-0">Split expenses effortlessly</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#f2f2f7] rounded-xl p-1 mb-7">
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 rounded-lg border-none cursor-pointer text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'bg-transparent text-[#86868b]'
              }`}
            >
              {t === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-[#fff2f2] text-[#ff3b30] text-[13px] rounded-xl px-3.5 py-2.5 mb-5">
            {error}
          </div>
        )}

        {tab === 'login' && (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#3a3a3c] mb-1.5">Email</label>
              <input {...loginForm.register('email')} type="email" placeholder="you@example.com" className={inputClass} />
              {loginForm.formState.errors.email && <p className="text-[#ff3b30] text-xs mt-1">{loginForm.formState.errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#3a3a3c] mb-1.5">Password</label>
              <input {...loginForm.register('password')} type="password" placeholder="••••••••" className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full bg-[#0071e3] text-white border-none rounded-full py-3 text-[15px] font-medium mt-1 cursor-pointer hover:bg-[#0077ed] transition-colors disabled:opacity-60"
            >
              {loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#3a3a3c] mb-1.5">Full name</label>
              <input {...registerForm.register('display_name')} type="text" placeholder="Your name" className={inputClass} />
              {registerForm.formState.errors.display_name && <p className="text-[#ff3b30] text-xs mt-1">{registerForm.formState.errors.display_name.message}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#3a3a3c] mb-1.5">Email</label>
              <input {...registerForm.register('email')} type="email" placeholder="you@example.com" className={inputClass} />
              {registerForm.formState.errors.email && <p className="text-[#ff3b30] text-xs mt-1">{registerForm.formState.errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#3a3a3c] mb-1.5">
                Phone <span className="text-[#86868b] font-normal">(optional)</span>
              </label>
              <input {...registerForm.register('phone_number')} type="tel" placeholder="+1 555 000 0000" className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#3a3a3c] mb-1.5">Password</label>
              <input {...registerForm.register('password')} type="password" placeholder="••••••••" className={inputClass} />
              {registerForm.formState.errors.password && <p className="text-[#ff3b30] text-xs mt-1">{registerForm.formState.errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={registerForm.formState.isSubmitting}
              className="w-full bg-[#0071e3] text-white border-none rounded-full py-3 text-[15px] font-medium mt-1 cursor-pointer hover:bg-[#0077ed] transition-colors disabled:opacity-60"
            >
              {registerForm.formState.isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
