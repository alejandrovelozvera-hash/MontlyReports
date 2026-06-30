import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Finance from './pages/Finance'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Settings from './pages/Settings'
import SplashScreen from './components/SplashScreen'

export default function App() {
  const [ready, setReady] = useState(false)

  if (!ready) return <SplashScreen onReady={() => setReady(true)} />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="finance" element={<Finance />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
