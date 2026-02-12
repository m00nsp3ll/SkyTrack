import { Router } from 'express';

/**
 * PWA Push Notification Routes - DEPRECATED
 *
 * Bu route'lar artık kullanılmıyor. Firebase FCM native push'a geçtik.
 * Uyumluluk için minimal endpoint bırakıldı.
 *
 * @deprecated FCM routes (/api/fcm) kullanın
 */

const router = Router();

// All PWA push endpoints are deprecated
router.all('*', (req, res) => {
  res.status(410).json({
    success: false,
    error: {
      code: 'DEPRECATED',
      message: 'PWA Push sistemi artık kullanılmıyor. Firebase FCM native push kullanın. Endpoint: /api/fcm',
    },
  });
});

export default router;
