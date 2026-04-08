'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { pilotsApi } from '@/lib/api'
import {
  ArrowLeft,
  Save,
  Loader2,
  GripVertical,
  CheckCircle,
  Plane,
  Coffee,
  Moon,
  UserPlus,
  User,
} from 'lucide-react'

interface Pilot {
  id: string
  name: string
  status: 'AVAILABLE' | 'ASSIGNED' | 'PICKED_UP' | 'IN_FLIGHT' | 'ON_BREAK' | 'OFF_DUTY'
  dailyFlightCount: number
  maxDailyFlights: number
  queuePosition: number
  inQueue: boolean
}

const statusConfig = {
  AVAILABLE: { label: 'Müsait', color: 'text-green-600', icon: CheckCircle },
  ASSIGNED: { label: 'Müşteri Atandı', color: 'text-purple-600', icon: UserPlus },
  PICKED_UP: { label: 'Müşteri Alındı', color: 'text-blue-500', icon: User },
  IN_FLIGHT: { label: 'Uçuşta', color: 'text-blue-600', icon: Plane },
  ON_BREAK: { label: 'Molada', color: 'text-yellow-600', icon: Coffee },
  OFF_DUTY: { label: 'Mesai Dışı', color: 'text-gray-500', icon: Moon },
}

export default function PilotQueuePage() {
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const fetchQueue = async () => {
    try {
      const response = await pilotsApi.getQueue()
      setPilots(response.data.data.queue)
    } catch (error) {
      console.error('Failed to fetch queue:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  // Drag & drop — ID tabanlı, index karışıklığı yok
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggedId) setDragOverId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    const inQueue = pilots.filter(p => p.inQueue)
    const draggedPilot = inQueue.find(p => p.id === draggedId)
    const targetPilot = inQueue.find(p => p.id === targetId)

    // Only allow reorder within inQueue pilots
    if (!draggedPilot || !targetPilot) return

    const fromIndex = inQueue.findIndex(p => p.id === draggedId)
    const toIndex = inQueue.findIndex(p => p.id === targetId)

    const newInQueue = [...inQueue]
    newInQueue.splice(fromIndex, 1)
    newInQueue.splice(toIndex, 0, draggedPilot)

    // Merge back with out-of-queue pilots
    const outOfQueue = pilots.filter(p => !p.inQueue)
    setPilots([...newInQueue, ...outOfQueue])
    setHasChanges(true)
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const moveUp = (index: number) => {
    const inQueue = pilots.filter(p => p.inQueue)
    if (index === 0) return
    const newInQueue = [...inQueue]
    ;[newInQueue[index - 1], newInQueue[index]] = [newInQueue[index], newInQueue[index - 1]]
    const outOfQueue = pilots.filter(p => !p.inQueue)
    setPilots([...newInQueue, ...outOfQueue])
    setHasChanges(true)
  }

  const moveDown = (index: number) => {
    const inQueue = pilots.filter(p => p.inQueue)
    if (index === inQueue.length - 1) return
    const newInQueue = [...inQueue]
    ;[newInQueue[index], newInQueue[index + 1]] = [newInQueue[index + 1], newInQueue[index]]
    const outOfQueue = pilots.filter(p => !p.inQueue)
    setPilots([...newInQueue, ...outOfQueue])
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const inQueue = pilots.filter(p => p.inQueue)
      const order = inQueue.map((pilot, index) => ({
        id: pilot.id,
        position: index + 1,
      }))
      await pilotsApi.reorderQueue(order)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save order:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const inQueuePilots = pilots.filter(p => p.inQueue)
  const outOfQueuePilots = pilots.filter(p => !p.inQueue)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/pilots">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Pilot Sırası</h1>
            <p className="text-muted-foreground">
              Sürükle-bırak veya okları kullanarak sırayı değiştir
            </p>
          </div>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Kaydet
          </Button>
        )}
      </div>

      {/* Info */}
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p>
            <strong>Not:</strong> Müşteri ataması <strong>tamamen sıraya göre</strong> yapılır.
          </p>
          <ol className="list-decimal ml-4 mt-2 space-y-1">
            <li><strong>Sıradaki pilot</strong> (listenin en üstündeki müsait pilot) yeni müşteriyi alır</li>
            <li>Müşteri aldıktan sonra pilot otomatik olarak <strong>sıranın sonuna</strong> geçer</li>
            <li>Günlük limit dolana kadar (varsayılan 7 uçuş) pilot sırada kalır</li>
          </ol>
          <p className="mt-2 text-blue-600 dark:text-blue-400">
            💡 Bu sayede <strong>round-robin</strong> (döngüsel) sıralama ile her pilot eşit fırsat alır.
          </p>
        </CardContent>
      </Card>

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle>Aktif Sıra ({inQueuePilots.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {inQueuePilots.map((pilot, index) => {
              const status = statusConfig[pilot.status]
              const StatusIcon = status.icon
              const isAtLimit = pilot.dailyFlightCount >= pilot.maxDailyFlights
              const isDragging = draggedId === pilot.id
              const isDragOver = dragOverId === pilot.id

              return (
                <div
                  key={pilot.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, pilot.id)}
                  onDragOver={(e) => handleDragOver(e, pilot.id)}
                  onDrop={(e) => handleDrop(e, pilot.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-4 p-4 cursor-grab active:cursor-grabbing transition-colors select-none
                    ${isDragging ? 'opacity-40 bg-blue-50' : ''}
                    ${isDragOver && !isDragging ? 'bg-blue-100 border-t-2 border-blue-500' : 'hover:bg-gray-50'}
                  `}
                >
                  <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{pilot.name}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <StatusIcon className={`h-3 w-3 ${status.color}`} />
                      <span className={status.color}>{status.label}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={isAtLimit ? 'text-red-600' : 'text-muted-foreground'}>
                        {pilot.dailyFlightCount}/{pilot.maxDailyFlights} uçuş
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveUp(index)} disabled={index === 0}>↑</Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveDown(index)} disabled={index === inQueuePilots.length - 1}>↓</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sıra Dışı Pilotlar */}
      {outOfQueuePilots.length > 0 && (
        <div>
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-orange-300" />
            <span className="text-sm font-medium text-orange-500 whitespace-nowrap">Sırada Değil</span>
            <div className="flex-1 h-px bg-orange-300" />
          </div>
          <Card className="border-orange-200">
            <CardContent className="p-0">
              <div className="divide-y">
                {outOfQueuePilots.map((pilot) => {
                  const status = statusConfig[pilot.status]
                  const StatusIcon = status.icon
                  const isAtLimit = pilot.dailyFlightCount >= pilot.maxDailyFlights
                  return (
                    <div key={pilot.id} className="flex items-center gap-4 p-4 opacity-60 bg-orange-50/40">
                      <div className="w-5" />
                      <div className="flex items-center justify-center w-8 h-8 bg-orange-300 text-white rounded-full text-sm font-bold">—</div>
                      <div className="flex-1">
                        <p className="font-medium">{pilot.name}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <StatusIcon className={`h-3 w-3 ${status.color}`} />
                          <span className={status.color}>{status.label}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className={isAtLimit ? 'text-red-600' : 'text-muted-foreground'}>
                            {pilot.dailyFlightCount}/{pilot.maxDailyFlights} uçuş
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
