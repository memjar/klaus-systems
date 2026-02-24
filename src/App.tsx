import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthGate } from './components/AuthGate'
import Chat from './pages/Chat'
import Kode from './pages/Kode'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Explorer = lazy(() => import('./pages/Explorer'))
const SQLLab = lazy(() => import('./pages/SQLLab'))
const Insights = lazy(() => import('./pages/Insights'))
const Reports = lazy(() => import('./pages/Reports'))
const DuckDB = lazy(() => import('./pages/DuckDB'))

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  return (
    <AuthGate>
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Layout apiUrl={API_URL} />}>
            <Route index element={<Chat apiUrl={API_URL} />} />
            <Route path="kode" element={<Kode apiUrl={API_URL} />} />
            <Route path="dashboard" element={<Dashboard apiUrl={API_URL} />} />
            <Route path="explorer" element={<Explorer apiUrl={API_URL} />} />
            <Route path="sql" element={<SQLLab apiUrl={API_URL} />} />
            <Route path="insights" element={<Insights apiUrl={API_URL} />} />
            <Route path="reports" element={<Reports apiUrl={API_URL} />} />
            <Route path="duckdb" element={<DuckDB apiUrl={API_URL} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthGate>
  )
}

export default App
