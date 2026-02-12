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

// GET /api/push/vapid-public-key - Deprecated but kept for compatibility
router.get('/vapid-public-key', (req, res) => {
  res.status(410).json({
    success: false,
    error: {
      code: 'DEPRECATED',
      message: 'PWA Push artık desteklenmiyor. Native FCM push kullanın.',
    },
  });
});

// All other PWA push endpoints are deprecated
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

// POST /api/push/subscribe - Register a push subscription
router.post(
  '/subscribe',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { endpoint, keys, device } = req.body;
    const userId = req.user!.id;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new AppError('Geçersiz subscription verisi', 400, 'INVALID_SUBSCRIPTION');
    }

    // Upsert subscription (update if exists, create if not)
    const subscription = await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint,
        },
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        device: device || null,
        isActive: true,
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        device: device || null,
        isActive: true,
      },
    });

    res.json({
      success: true,
      data: {
        id: subscription.id,
        device: subscription.device,
      },
      message: 'Bildirim aboneliği kaydedildi',
    });
  })
);

// POST /api/push/unsubscribe - Remove a push subscription
router.post(
  '/unsubscribe',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { endpoint } = req.body;
    const userId = req.user!.id;

    if (!endpoint) {
      throw new AppError('Endpoint gerekli', 400, 'MISSING_ENDPOINT');
    }

    await prisma.pushSubscription.updateMany({
      where: {
        userId,
        endpoint,
      },
      data: {
        isActive: false,
      },
    });

    res.json({
      success: true,
      message: 'Bildirim aboneliği kaldırıldı',
    });
  })
);

// GET /api/push/subscriptions - Get subscriptions (admin gets all, others get own)
router.get(
  '/subscriptions',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Admin gets all subscriptions with stats
    if (userRole === 'ADMIN') {
      const subscriptions = await prisma.pushSubscription.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate stats
      const stats = {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.isActive).length,
        byRole: {} as Record<string, number>,
        byDevice: {} as Record<string, number>,
      };

      subscriptions.forEach(sub => {
        const role = sub.user.role;
        stats.byRole[role] = (stats.byRole[role] || 0) + 1;
        const device = sub.device || 'Unknown';
        stats.byDevice[device] = (stats.byDevice[device] || 0) + 1;
      });

      return res.json({
        success: true,
        data: {
          subscriptions,
          stats,
        },
      });
    }

    // Non-admin gets only their own subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        device: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { subscriptions },
    });
  })
);

// GET /api/push/subscriptions/all - Get all subscriptions (admin only)
router.get(
  '/subscriptions/all',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            pilot: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: subscriptions.map((s) => ({
        id: s.id,
        device: s.device,
        createdAt: s.createdAt,
        user: {
          id: s.user.id,
          username: s.user.username,
          role: s.user.role,
          pilotName: s.user.pilot?.name,
        },
      })),
    });
  })
);

// POST /api/push/test/:userId - Send test notification to a user (admin only)
router.post(
  '/test/:userId',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
    }

    const result = await sendPushToUser(userId, {
      title: '🔔 Test Bildirimi',
      body: 'Bu bir test bildirimidir. Bildirimler çalışıyor!',
      url: '/',
      tag: 'test',
    });

    res.json({
      success: result.success,
      data: result,
      message: result.success
        ? `Test bildirimi ${result.sent} cihaza gönderildi`
        : 'Bildirim gönderilemedi',
    });
  })
);

// POST /api/push/test-self - Send test notification to current user
router.post(
  '/test-self',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const userId = req.user!.id;

    const result = await sendPushToUser(userId, {
      title: '🔔 Test Bildirimi',
      body: 'Bildirimler başarıyla çalışıyor!',
      url: '/',
      tag: 'test',
    });

    res.json({
      success: result.success,
      data: result,
      message: result.success
        ? `Test bildirimi ${result.sent} cihaza gönderildi`
        : 'Bildirim gönderilemedi',
    });
  })
);

// POST /api/push/broadcast - Send notification to everyone (admin only)
router.post(
  '/broadcast',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { title, body, url } = req.body;

    if (!title || !body) {
      throw new AppError('Başlık ve mesaj gerekli', 400, 'MISSING_FIELDS');
    }

    const result = await sendPushBroadcast({
      title,
      body,
      url: url || '/',
      tag: 'broadcast',
    });

    res.json({
      success: result.success,
      data: result,
      message: `Bildirim ${result.sent} cihaza gönderildi`,
    });
  })
);

// POST /api/push/role/:role - Send notification to all users with a role (admin only)
router.post(
  '/role/:role',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { role } = req.params;
    const { title, body, url } = req.body;

    const validRoles = ['ADMIN', 'OFFICE_STAFF', 'PILOT', 'MEDIA_SELLER'];
    if (!validRoles.includes(role)) {
      throw new AppError('Geçersiz rol', 400, 'INVALID_ROLE');
    }

    if (!title || !body) {
      throw new AppError('Başlık ve mesaj gerekli', 400, 'MISSING_FIELDS');
    }

    const result = await sendPushToRole(role as any, {
      title,
      body,
      url: url || '/',
    });

    res.json({
      success: result.success,
      data: result,
      message: `Bildirim ${result.sent} cihaza gönderildi`,
    });
  })
);

// DELETE /api/push/subscription/:id - Delete a specific subscription (admin only)
router.delete(
  '/subscription/:id',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { id } = req.params;

    await prisma.pushSubscription.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Abonelik silindi',
    });
  })
);

// GET /api/push/vapid-public-key - Get VAPID public key (public endpoint)
router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return res.status(500).json({
      success: false,
      error: { message: 'VAPID key yapılandırılmamış' },
    });
  }

  res.json({
    success: true,
    data: { publicKey },
  });
});

export default router;
