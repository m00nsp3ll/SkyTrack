'use client'

/**
 * PWA Push Notification Manager - DEPRECATED
 *
 * Bu component artık kullanılmıyor. Firebase FCM native push'a geçtik.
 * Uyumluluk için boş component olarak bırakıldı.
 *
 * @deprecated Native push notifications (FCM) kullanın
 */

interface PushNotificationManagerProps {
  onSubscribed?: () => void
  showOnMount?: boolean
}

export function PushNotificationManager({
  onSubscribed,
  showOnMount = true
}: PushNotificationManagerProps) {
  // PWA Push sistemi artık kullanılmıyor - FCM native push kullanıyoruz
  return null
}
