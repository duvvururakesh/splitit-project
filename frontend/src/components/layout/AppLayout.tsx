import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

export default function AppLayout() {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--color-apple-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[var(--color-apple-bg)] pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}
