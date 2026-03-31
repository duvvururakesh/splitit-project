import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#f5f5f7]">
        <Outlet />
      </main>
    </div>
  )
}
