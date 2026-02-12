'use client'

import { useState, useEffect } from 'react'
import { X, Bell } from 'lucide-react'
import { setInAppNotificationHandler, isNativePlatform } from '@/lib/nativePush'
import type { PushNotificationSchema } from '@capacitor/push-notifications'

interface Notification {
  id: string
  title: string
  body: string
  data?: Record<string, any>
  timestamp: number
}

export function InAppNotificationBanner() {
  const [notification, setNotification] = useState<Notification | null>(null)

  useEffect(() => {
    // Only setup on native platforms
    if (!isNativePlatform()) return

    // Register handler for in-app notifications
    setInAppNotificationHandler((fcmNotification: PushNotificationSchema) => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        title: fcmNotification.title || 'Bildirim',
        body: fcmNotification.body || '',
        data: fcmNotification.data,
        timestamp: Date.now(),
      }

      setNotification(newNotification)

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setNotification(null)
      }, 5000)
    })
  }, [])

  if (!notification) return null

  const handleClose = () => {
    setNotification(null)
  }

  const handleClick = () => {
    // Route based on notification type (same logic as pushNotificationActionPerformed)
    const notificationType = notification.data?.type

    switch (notificationType) {
      case 'customer_assigned':
      case 'customer_reassigned':
      case 'flight_completed':
      case 'flight_cancelled':
      case 'pilot_limit_warning':
      case 'pilot_limit_reached':
        window.location.href = '/pilot'
        break

      case 'broadcast':
      case 'admin_alert':
        window.location.href = '/admin'
        break

      default:
        const url = notification.data?.url
        if (url) {
          window.location.href = url
        }
    }

    setNotification(null)
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-in slide-in-from-top">
      <div
        className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow"
        onClick={handleClick}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 mb-1">{notification.title}</p>
            <p className="text-sm text-gray-600">{notification.body}</p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClose()
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
