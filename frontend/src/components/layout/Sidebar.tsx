import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/auth.store'
import { getMe } from '../../api/auth'
import { avatarColor } from '../../utils/avatar'

const links = [
  {
    to: '/split',
    label: 'Bill Calculator',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2"/>
        <line x1="8" y1="9" x2="16" y2="9"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="12" y2="17"/>
      </svg>
    ),
  },
  {
    to: '/contacts',
    label: 'Contacts',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    to: '/activity',
    label: 'Activity',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })

  return (
    <aside className="w-[220px] shrink-0 bg-[#f9f9f9] border-r border-[#e8e8ed] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-[18px] border-b border-[#e8e8ed]">
        <span className="text-[17px] font-semibold text-[#1d1d1f] tracking-[-0.3px]">
          Splitit
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all no-underline ${
                isActive
                  ? 'font-medium text-[#1d1d1f] bg-[#e8e8ed]'
                  : 'font-normal text-[#6e6e73] hover:bg-[#f0f0f2] hover:text-[#1d1d1f]'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-2.5 pb-5 pt-3 border-t border-[#e8e8ed] space-y-1">
        {/* New split button */}
        <button
          onClick={() => {
            if (location.pathname === '/split' && !location.search) {
              window.dispatchEvent(new CustomEvent('splitit:new-split'))
            } else {
              navigate('/split')
            }
          }}
          className="flex items-center justify-center gap-1.5 w-full bg-[#0071e3] text-white text-sm font-medium px-4 py-2.5 rounded-full border-none cursor-pointer mb-2.5 hover:bg-[#0077ed] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New split
        </button>

        {/* Account link */}
        <NavLink
          to="/account"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all no-underline ${
              isActive
                ? 'font-medium text-[#1d1d1f] bg-[#e8e8ed]'
                : 'font-normal text-[#6e6e73] hover:bg-[#f0f0f2] hover:text-[#1d1d1f]'
            }`
          }
        >
          {me?.display_name ? (
            <div
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{ background: avatarColor(me.display_name).bg, color: avatarColor(me.display_name).text }}
            >
              {me.display_name[0].toUpperCase()}
            </div>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          )}
          {me?.display_name || 'Account'}
        </NavLink>
      </div>
    </aside>
  )
}
