import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { avatarColor } from '../../utils/avatar'
import Button from '../ui/Button'
import { IconActivity, IconPlus, IconReceipt, IconUser, IconUsers } from '../../utils/icons'
import { getMe, logoutApi } from '../../api/auth'
import { useAuthStore } from '../../store/auth.store'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: <IconActivity /> },
  { to: '/split', label: 'Bill Calculator', icon: <IconReceipt /> },
  { to: '/contacts', label: 'Contacts', icon: <IconUsers /> },
  { to: '/activity', label: 'Saved Splits', icon: <IconActivity /> },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { logout } = useAuthStore()
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  })

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
      // clear local auth state even if server logout fails
    } finally {
      logout()
      queryClient.clear()
      navigate('/auth')
    }
  }

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 bg-[var(--color-apple-sidebar)] border-r border-[var(--color-card-border)] flex-col h-screen sticky top-0">
      <div className="px-5 py-[18px] border-b border-[var(--color-card-border)]">
        <span className="text-base font-semibold text-[var(--color-apple-text)]">Splitit</span>
      </div>

      <nav className="flex-1 p-2.5">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all no-underline ${
                isActive
                  ? 'font-medium text-[var(--color-apple-text)] bg-[var(--color-card-border)]'
                  : 'font-normal text-[var(--color-apple-secondary)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-apple-text)]'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2.5 pb-5 pt-3 border-t border-[var(--color-card-border)] space-y-1">
        <Button
          onClick={() => {
            if (location.pathname === '/split' && !location.search) {
              window.dispatchEvent(new CustomEvent('splitit:new-split'))
            } else {
              navigate('/split')
            }
          }}
          className="w-full rounded-xl"
        >
          <IconPlus size={14} />
          New split
        </Button>

        <NavLink
          to="/account"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all no-underline ${
              isActive
                ? 'font-medium text-[var(--color-apple-text)] bg-[var(--color-card-border)]'
                : 'font-normal text-[var(--color-apple-secondary)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-apple-text)]'
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
            <IconUser />
          )}
          {me?.display_name || 'Account'}
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all no-underline text-[var(--color-apple-red)] hover:bg-[var(--color-apple-danger-bg)]"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
