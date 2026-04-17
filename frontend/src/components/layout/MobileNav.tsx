import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { IconActivity, IconPlus, IconReceipt, IconUser, IconUsers } from '../../utils/icons'

const links = [
  { to: '/dashboard', label: 'Home', icon: <IconActivity size={16} /> },
  { to: '/split', label: 'Split', icon: <IconReceipt size={16} /> },
  { to: '/contacts', label: 'People', icon: <IconUsers size={16} /> },
  { to: '/activity', label: 'Saved', icon: <IconActivity size={16} /> },
  { to: '/account', label: 'Account', icon: <IconUser size={16} /> },
]

export default function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-card-border)] bg-[var(--color-apple-card)] px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1">
      <div className="grid grid-cols-5 gap-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[11px] transition-colors ${
                isActive
                  ? 'text-[var(--color-apple-blue)] bg-[var(--color-apple-blue-light)]'
                  : 'text-[var(--color-apple-secondary)]'
              }`
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => {
            if (location.pathname === '/split' && !location.search) {
              window.dispatchEvent(new CustomEvent('splitit:new-split'))
            } else {
              navigate('/split')
            }
          }}
          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[11px] text-[var(--color-apple-blue)]"
        >
          <IconPlus size={16} />
          <span>New</span>
        </button>
      </div>
    </div>
  )
}
