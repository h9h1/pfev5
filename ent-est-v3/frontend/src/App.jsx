import { useState, useEffect } from 'react'
import { getUser } from './services/api.js'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [nav,  setNav]  = useState('home')

  useEffect(() => { const u = getUser(); if(u) setUser(u) }, [])

  const handleLogin = (u, token) => {
    localStorage.setItem('jwt_token', token)
    localStorage.setItem('jwt_user', JSON.stringify(u))
    setUser(u); setNav('home')
  }
  const handleLogout = () => {
    localStorage.removeItem('jwt_token'); localStorage.removeItem('jwt_user')
    setUser(null)
  }

  if (!user) return <Login onLogin={handleLogin}/>
  return <Dashboard user={user} nav={nav} setNav={setNav} onLogout={handleLogout}/>
}
