import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/auth.store'
import AppLayout from './components/layout/AppLayout'
import AuthPage from './pages/Auth/AuthPage'
import ActivityPage from './pages/Activity/ActivityPage'
import BillSplitPage from './pages/Split/BillSplitPage'
import ContactsPage from './pages/Contacts/ContactsPage'
import AccountPage from './pages/Account/AccountPage'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/split" replace />} />
            <Route path="/split" element={<BillSplitPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="*" element={<Navigate to="/split" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
