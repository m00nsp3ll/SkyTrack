'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.skytrackyp.com/api'

export default function KatlamaciPage() {
  const [inFlight, setInFlight] = useState<any[]>([])
  const [waiting, setWaiting] = useState<any[]>([])
  const [now, setNow] = useState(Date.now())
  const [authed, setAuthed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (!token || !userStr) { router.replace('/login'); return }
    try {
      const user = JSON.parse(userStr)
      if (!['KATLAMACI', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.replace('/login'); return }
    } catch { router.replace('/login'); return }
    setAuthed(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!authed) return
    const token = localStorage.getItem('token')
    if (!token) return

    const load = () => {
      fetch(`${API}/katlamaci/live`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => { if (r.status === 401) { localStorage.clear(); router.replace('/login'); return null } return r.json() })
        .then(data => { if (data) { setInFlight(data.data.inFlight); setWaiting(data.data.waiting); setNow(Date.now()) } })
        .catch(() => {})
    }

    load()
    const interval = setInterval(load, 15000)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', load)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', load)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  const mins = (s: string) => s ? Math.floor((now - new Date(s).getTime()) / 60000) : 0

  if (!authed) return <div style={{ minHeight: '100vh', background: '#f9fafb' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: 16, paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <b style={{ fontSize: 22 }}>SkyTrack Katlamacı</b>
        <span style={{ color: 'red', cursor: 'pointer', fontSize: 14 }} onClick={() => { localStorage.clear(); router.replace('/login') }}>Çıkış</span>
      </div>

      <b style={{ color: '#1d4ed8', fontSize: 18 }}>✈ Havada ({inFlight.length})</b>
      {inFlight.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 8, padding: 16, margin: '8px 0', textAlign: 'center', color: '#aaa' }}>Havada pilot yok</div>
      ) : inFlight.map((f: any) => (
        <div key={f.flightId} style={{ background: '#fff', borderRadius: 8, padding: 12, margin: '8px 0', borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 17 }}>{f.pilotName}</b>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 17 }}>{mins(f.takeoffAt)} dk</span>
            <br /><span style={{ fontSize: 11, color: '#999' }}>uçuş süresi</span>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 16 }} />
      <b style={{ color: '#b45309', fontSize: 18 }}>⏳ Bekliyor ({waiting.length})</b>
      {waiting.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 8, padding: 16, margin: '8px 0', textAlign: 'center', color: '#aaa' }}>Bekleyen pilot yok</div>
      ) : waiting.map((f: any) => (
        <div key={f.flightId} style={{ background: '#fff', borderRadius: 8, padding: 12, margin: '8px 0', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 17 }}>{f.pilotName}</b>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#d97706', fontWeight: 'bold', fontSize: 17 }}>{mins(f.assignedAt)} dk</span>
            <br /><span style={{ fontSize: 11, color: '#999' }}>bekleme</span>
          </div>
        </div>
      ))}
    </div>
  )
}
