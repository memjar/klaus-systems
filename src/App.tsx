import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthGate } from './components/AuthGate'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'
import Explorer from './pages/Explorer'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<Layout apiUrl={API_URL} />}>
          <Route index element={<Chat apiUrl={API_URL} />} />
          <Route path="dashboard" element={<Dashboard apiUrl={API_URL} />} />
          <Route path="explorer" element={<Explorer apiUrl={API_URL} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  )
}

export default App
