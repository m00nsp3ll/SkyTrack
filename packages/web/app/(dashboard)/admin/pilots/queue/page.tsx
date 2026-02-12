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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newPilots = [...pilots]
    const draggedPilot = newPilots[draggedIndex]
    newPilots.splice(draggedIndex, 1)
    newPilots.splice(index, 0, draggedPilot)
    setPilots(newPilots)
    setDraggedIndex(index)
    setHasChanges(true)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newPilots = [...pilots]
    ;[newPilots[index - 1], newPilots[index]] = [newPilots[index], newPilots[index - 1]]
    setPilots(newPilots)
    setHasChanges(true)
  }

  const moveDown = (index: number) => {
    if (index === pilots.length - 1) return
    const newPilots = [...pilots]
    ;[newPilots[index], newPilots[index + 1]] = [newPilots[index + 1], newPilots[index]]
    setPilots(newPilots)
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const order = pilots.map((pilot, index) => ({
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
          <CardTitle>Aktif Pilotlar ({pilots.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {pilots.map((pilot, index) => {
              const status = statusConfig[pilot.status]
              const StatusIcon = status.icon
              const isAtLimit = pilot.dailyFlightCount >= pilot.maxDailyFlights

              return (
                <div
                  key={pilot.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-4 p-4 cursor-move hover:bg-gray-50 ${
                    draggedIndex === index ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Drag Handle */}
                  <GripVertical className="h-5 w-5 text-gray-400" />

                  {/* Position */}
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full text-sm font-bold">
                    {index + 1}
                  </div>

                  {/* Pilot Info */}
                  <div className="flex-1">
                    <p className="font-medium">{pilot.name}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <StatusIcon className={`h-3 w-3 ${status.color}`} />
                      <span className={status.color}>{status.label}</span>
                      <span className="text-muted-foreground">·</span>
                      <span
                        className={
                          isAtLimit ? 'text-red-600' : 'text-muted-foreground'
                        }
                      >
                        {pilot.dailyFlightCount}/{pilot.maxDailyFlights} uçuş
                      </span>
                    </div>
                  </div>

                  {/* Move Buttons */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveDown(index)}
                      disabled={index === pilots.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
