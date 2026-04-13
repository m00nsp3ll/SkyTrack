'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { teamsApi, pilotsApi } from '@/lib/api'
import { Users, Plus, Edit, Trash2, Crown, RefreshCw, X } from 'lucide-react'

interface Pilot {
  id: string
  name: string
  status: string
  queuePosition: number
  isTeamLeader: boolean
  dailyFlightCount: number
  maxDailyFlights: number
  teamId?: string | null
}

interface Team {
  id: string
  name: string
  color: string
  sortOrder: number
  pilots: Pilot[]
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [allPilots, setAllPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<{ id?: string; name: string; color: string; sortOrder: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Team | null>(null)
  const [assignPilot, setAssignPilot] = useState<{ pilotId: string; pilotName: string; currentTeamId: string | null } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [teamsRes, pilotsRes] = await Promise.all([teamsApi.getAll(), pilotsApi.getAll()])
      setTeams(teamsRes.data.data || [])
      setAllPilots(pilotsRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const saveTeam = async () => {
    if (!editModal) return
    try {
      if (editModal.id) {
        await teamsApi.update(editModal.id, { name: editModal.name, color: editModal.color, sortOrder: editModal.sortOrder })
      } else {
        await teamsApi.create({ name: editModal.name, color: editModal.color, sortOrder: editModal.sortOrder })
      }
      setEditModal(null)
      fetchData()
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Kaydedilemedi')
    }
  }

  const deleteTeam = async () => {
    if (!deleteConfirm) return
    try {
      await teamsApi.delete(deleteConfirm.id)
      setDeleteConfirm(null)
      fetchData()
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Silinemedi')
    }
  }

  const setPilotTeam = async (teamId: string | null) => {
    if (!assignPilot) return
    try {
      await teamsApi.setPilotTeam(assignPilot.pilotId, teamId)
      setAssignPilot(null)
      fetchData()
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Atanamadı')
    }
  }

  const toggleLeader = async (pilotId: string) => {
    try {
      await teamsApi.toggleLeader(pilotId)
      fetchData()
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Değiştirilemedi')
    }
  }

  if (loading) return <div className="flex justify-center p-12"><RefreshCw className="h-8 w-8 animate-spin" /></div>

  const assignedPilotIds = new Set(teams.flatMap(t => t.pilots.map(p => p.id)))
  const unassignedPilots = allPilots.filter(p => !assignedPilotIds.has(p.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Takım Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground">{teams.length} takım · {assignedPilotIds.size} atanmış pilot · {unassignedPilots.length} atanmamış</p>
        </div>
        <Button onClick={() => setEditModal({ name: '', color: '#3b82f6', sortOrder: teams.length })}>
          <Plus className="h-4 w-4 mr-2" /> Yeni Takım
        </Button>
      </div>

      {/* Takımlar */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map(team => (
          <Card key={team.id} className="border-t-4" style={{ borderTopColor: team.color }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }}></span>
                  {team.name}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditModal({ id: team.id, name: team.name, color: team.color, sortOrder: team.sortOrder })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(team)} className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{team.pilots.length} pilot</p>
            </CardHeader>
            <CardContent className="space-y-1">
              {team.pilots.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-2">Atanmış pilot yok</p>
              ) : (
                team.pilots.map(pilot => (
                  <div key={pilot.id} className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 ${pilot.isTeamLeader ? 'bg-amber-50' : ''}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{pilot.name}</span>
                      {pilot.isTeamLeader && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs flex-shrink-0">
                          <Crown className="h-3 w-3 mr-1" />Lider
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant={pilot.isTeamLeader ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleLeader(pilot.id)}
                        title={pilot.isTeamLeader ? 'Liderliği kaldır' : 'Lider yap'}
                        className={`h-7 px-2 ${pilot.isTeamLeader ? 'bg-amber-500 hover:bg-amber-600 border-amber-500' : ''}`}
                      >
                        <Crown className={`h-3.5 w-3.5 ${pilot.isTeamLeader ? 'text-white' : 'text-gray-500'}`} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignPilot({ pilotId: pilot.id, pilotName: pilot.name, currentTeamId: team.id })}
                        className="h-7 px-2"
                        title="Takım değiştir"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`${pilot.name} takımdan çıkarılsın mı?`)) return
                          try {
                            await teamsApi.setPilotTeam(pilot.id, null)
                            fetchData()
                          } catch (e: any) {
                            alert(e.response?.data?.error?.message || 'Çıkarılamadı')
                          }
                        }}
                        className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                        title="Takımdan çıkar"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Atanmamış Pilotlar */}
      {unassignedPilots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atanmamış Pilotlar ({unassignedPilots.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-3">
              {unassignedPilots.map(pilot => (
                <button
                  key={pilot.id}
                  onClick={() => setAssignPilot({ pilotId: pilot.id, pilotName: pilot.name, currentTeamId: null })}
                  className="flex items-center justify-between p-2 rounded text-left hover:bg-gray-50 text-sm"
                >
                  <span>{pilot.name}</span>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Takım Edit/Create Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editModal.id ? 'Takımı Düzenle' : 'Yeni Takım'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Takım Adı</label>
                <Input value={editModal.name} onChange={e => setEditModal({ ...editModal, name: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium">Renk</label>
                <div className="flex items-center gap-2">
                  <Input type="color" value={editModal.color} onChange={e => setEditModal({ ...editModal, color: e.target.value })} className="w-14 h-10 p-1" />
                  <Input value={editModal.color} onChange={e => setEditModal({ ...editModal, color: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Sıra</label>
                <Input type="number" value={editModal.sortOrder} onChange={e => setEditModal({ ...editModal, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setEditModal(null)}>İptal</Button>
              <Button onClick={saveTeam}>Kaydet</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pilot Assign Modal */}
      {assignPilot && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">Takım Ata</h2>
            <p className="text-sm text-muted-foreground mb-4">{assignPilot.pilotName}</p>
            <div className="space-y-1">
              <button
                onClick={() => setPilotTeam(null)}
                className={`w-full text-left p-2 rounded-lg hover:bg-gray-100 ${!assignPilot.currentTeamId ? 'bg-gray-100 font-bold' : ''}`}
              >
                <span className="text-muted-foreground italic">Takıma atama (çıkar)</span>
              </button>
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => setPilotTeam(t.id)}
                  className={`w-full text-left p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 ${assignPilot.currentTeamId === t.id ? 'bg-gray-100 font-bold' : ''}`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
                  <span>{t.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{t.pilots.length} pilot</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setAssignPilot(null)}>Kapat</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-3 text-red-700">⚠️ Takımı Sil</h2>
            <p className="mb-4">
              <strong>{deleteConfirm.name}</strong> takımını silmek istediğinize emin misiniz?
              Takımdaki {deleteConfirm.pilots.length} pilot atanmamış konuma geçecek.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>İptal</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={deleteTeam}>Evet, Sil</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
