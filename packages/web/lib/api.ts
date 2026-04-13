import axios from 'axios'

// Dynamic API URL based on current hostname (works on mobile and PC)
function getApiUrl() {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001/api'
  }
  const hostname = window.location.hostname

  // If using custom domain, use api subdomain
  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return 'https://api.skytrackyp.com/api'
  }

  // If using temporary Cloudflare tunnel, use api subdomain dynamically
  if (hostname.includes('trycloudflare.com')) {
    return `https://${hostname.replace(/^[^.]+/, 'api')}/api`
  }

  // Capacitor app uses localhost but needs real API
  if (hostname === 'localhost' && typeof (window as any).Capacitor !== 'undefined') {
    return 'https://api.skytrackyp.com/api'
  }

  // Local network - use HTTPS
  return `https://${hostname}:3001/api`
}

export const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Track if we're already redirecting to prevent multiple redirects
let isRedirectingToLogin = false

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login for actual auth failures, not network errors
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname

      // Don't redirect if already on login page or if we're already redirecting
      if (currentPath === '/login' || isRedirectingToLogin) {
        return Promise.reject(error)
      }

      // Check the error code - only clear session for definitive auth failures
      const errorCode = error.response?.data?.error?.code
      if (errorCode === 'UNAUTHORIZED' || errorCode === 'INVALID_TOKEN') {
        isRedirectingToLogin = true
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('permissions')
        window.location.href = '/login'
        // Reset after a delay
        setTimeout(() => { isRedirectingToLogin = false }, 3000)
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),

  me: () => api.get('/auth/me'),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('permissions')
    }
  },
}

// Pilots API
export const pilotsApi = {
  getAll: () => api.get('/pilots'),
  getById: (id: string) => api.get(`/pilots/${id}`),
  getPanel: (id: string) => api.get(`/pilots/${id}/panel`),
  create: (data: any) => api.post('/pilots', data),
  update: (id: string, data: any) => api.put(`/pilots/${id}`, data),
  delete: (id: string) => api.delete(`/pilots/${id}`),
  getByIdWithDates: (id: string, from: string, to: string) =>
    api.get(`/pilots/${id}`, { params: { from, to } }),
  getQueue: () => api.get('/pilots/queue'),
  reorderQueue: (order: { id: string; position: number }[]) =>
    api.post('/pilots/queue/reorder', { order }),
  updateStatus: (id: string, status: string) =>
    api.patch(`/pilots/${id}/status`, { status }),
  toggleQueue: (id: string) =>
    api.patch(`/pilots/${id}/queue-toggle`),
  forfeit: (id: string) => api.post(`/pilots/${id}/forfeit`),
  forfeitMe: () => api.post('/pilots/me/forfeit'),
}

// FCM / Notification API
export const fcmApi = {
  getPilotNotifications: (pilotId: string) =>
    api.get(`/fcm/pilot-notifications/${pilotId}`),
  markAllRead: (pilotId: string) =>
    api.patch(`/fcm/pilot-notifications/${pilotId}/read-all`),
  markRead: (id: string) =>
    api.patch(`/fcm/pilot-notifications/${id}/read`),
}

// Customers API
export const customersApi = {
  getAll: () => api.get('/customers'),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
}

// Flights API
export const flightsApi = {
  getAll: (params?: { status?: string; pilotId?: string; date?: string; search?: string; cursor?: string; limit?: number }) =>
    api.get('/flights', { params }),
  getById: (id: string) => api.get(`/flights/${id}`),
  getLive: () => api.get('/flights/live'),
  getStatsToday: () => api.get('/flights/stats/today'),
  getStatsHourly: (date?: string) => api.get('/flights/stats/hourly', { params: { date } }),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/flights/${id}/status`, { status, notes }),
  addNotes: (id: string, notes: string) =>
    api.post(`/flights/${id}/notes`, { notes }),
  cancel: (id: string, reason?: 'WEATHER' | 'CUSTOMER_CANCEL' | 'OTHER' | string, note?: string) =>
    api.post(`/flights/${id}/cancel`, { reason, note }),
  bulkCancel: (reason?: string) =>
    api.post('/flights/bulk-cancel', { reason }),
  reassign: (id: string, pilotId: string) =>
    api.post(`/flights/${id}/reassign`, { pilotId }),
}

// Media API
export const mediaApi = {
  // Get media folder info for customer
  getInfo: (customerId: string) => api.get(`/media/${customerId}`),

  // List files for customer
  getFiles: (customerId: string) => api.get(`/media/${customerId}/files`),

  // Upload files
  upload: (customerId: string, files: FormData) =>
    api.post(`/media/upload/${customerId}`, files, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Scan folder for media files
  scanFolder: (customerId: string) => api.post(`/media/${customerId}/scan`),

  // Update payment status
  updatePayment: (customerId: string, status: 'PENDING' | 'PAID', amount?: number) =>
    api.patch(`/media/${customerId}/payment`, { status, amount }),

  // Update delivery status
  updateDelivery: (customerId: string, status: 'PENDING' | 'READY' | 'DELIVERED') =>
    api.patch(`/media/${customerId}/delivery`, { status }),

  // Delete file
  deleteFile: (customerId: string, filename: string) =>
    api.delete(`/media/${customerId}/files/${filename}`),

  // Move files to another customer
  moveFiles: (sourceCustomerId: string, targetCustomerId: string) =>
    api.post(`/media/${sourceCustomerId}/move-to/${targetCustomerId}`),

  // Get today's stats
  getStatsToday: () => api.get('/media/stats/today'),

  // Get storage stats
  getStorage: () => api.get('/media/storage'),

  // Dashboard stats
  getDashboard: (params?: { date?: string; startDate?: string; endDate?: string }) =>
    api.get('/media/dashboard', { params }),

  // Dashboard chart data
  getDashboardChart: (period?: number) => api.get('/media/dashboard/chart', { params: { period } }),

  // Dashboard cashbox (currency breakdown)
  getCashbox: (params?: { date?: string; startDate?: string; endDate?: string }) =>
    api.get('/media/dashboard/cashbox', { params }),

  // Open customer folder in Finder
  openFolder: (customerId: string) => api.post(`/media/${customerId}/open-folder`),

  // Open pilot folder in Finder
  openPilotFolder: (pilotId: string, date?: string) =>
    api.post(`/media/pilot/${pilotId}/open-folder`, { date }),

  // Media sales table
  getSales: (params?: {
    date?: string
    startDate?: string
    endDate?: string
    payment?: string
    delivery?: string
    pilot?: string
    search?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: string
  }) => api.get('/media/sales', { params }),

  // Staff summary
  getStaffSummary: (params?: { date?: string; startDate?: string; endDate?: string }) =>
    api.get('/media/staff-summary', { params }),

  // Pilot summary
  getPilotSummary: (params?: { date?: string; startDate?: string; endDate?: string }) =>
    api.get('/media/pilot-summary', { params }),

  // List all media folders with pagination
  getFolders: (params?: {
    date?: string
    paymentStatus?: string
    deliveryStatus?: string
    cursor?: string
    limit?: number
  }) => api.get('/media/folders', { params }),

  // Get download URL (for public access)
  getDownloadUrl: (displayId: string) => {
    if (typeof window === 'undefined') return `https://api.skytrackyp.com/api/media/${displayId}/download`
    const hostname = window.location.hostname

    if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
      return `https://api.skytrackyp.com/api/media/${displayId}/download`
    }
    if (hostname.includes('trycloudflare.com')) {
      return `https://${hostname.replace(/^[^.]+/, 'api')}/api/media/${displayId}/download`
    }
    return `https://${hostname}:3001/api/media/${displayId}/download`
  },

  // Get single file download URL
  getFileDownloadUrl: (displayId: string, filename: string) => {
    if (typeof window === 'undefined') return `https://api.skytrackyp.com/api/media/${displayId}/download/${filename}`
    const hostname = window.location.hostname

    if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
      return `https://api.skytrackyp.com/api/media/${displayId}/download/${filename}`
    }
    if (hostname.includes('trycloudflare.com')) {
      return `https://${hostname.replace(/^[^.]+/, 'api')}/api/media/${displayId}/download/${filename}`
    }
    return `https://${hostname}:3001/api/media/${displayId}/download/${filename}`
  },
}

// Products API
export const productsApi = {
  getAll: (params?: { category?: string; activeOnly?: string; favorites?: string }) =>
    api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getFavorites: () => api.get('/products/favorites'),
  getLowStock: () => api.get('/products/low-stock'),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  toggle: (id: string) => api.patch(`/products/${id}/toggle`),
  toggleFavorite: (id: string) => api.patch(`/products/${id}/favorite`),
  updateStock: (id: string, data: { stock?: number; adjustment?: number }) =>
    api.patch(`/products/${id}/stock`, data),
  updatePrice: (id: string, price: number) =>
    api.patch(`/products/${id}/price`, { price }),
}

// Sales API
export const salesApi = {
  create: (data: { customerId?: string; items: any[]; paymentStatus?: string; paymentMethod?: string; primaryCurrency?: string; paymentDetails?: any[] }) =>
    api.post('/sales', data),
  getAll: (params?: { customerId?: string; paymentStatus?: string; date?: string; category?: string; cursor?: string }) =>
    api.get('/sales', { params }),
  getByCustomer: (customerId: string) => api.get(`/sales/customer/${customerId}`),
  getUnpaid: (date?: string) => api.get('/sales/unpaid', { params: { date } }),
  getDailyReport: (date?: string) => api.get('/sales/daily-report', { params: { date } }),
  updatePayment: (id: string, paymentStatus: string, paymentMethod?: string, currency?: string) =>
    api.patch(`/sales/${id}/payment`, { paymentStatus, paymentMethod, currency }),
  bulkPay: (customerId: string, paymentMethod?: string, currency?: string) =>
    api.post(`/sales/bulk-pay/${customerId}`, { paymentMethod, currency }),
  delete: (id: string) => api.delete(`/sales/${id}`),
}

// Currency API
export const currencyApi = {
  getRates: () => api.get('/currency/rates'),
  convert: (data: { amount: number; from: string; to: string }) => api.post('/currency/convert', data),
  updateRate: (currency: string, data: { buyRate: number; sellRate: number }) => api.put(`/currency/rates/${currency}`, data),
  getHistory: (currency: string, days?: number) => api.get(`/currency/history?currency=${currency}&days=${days || 7}`),
}

// Reports API
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getDashboardCharts: () => api.get('/reports/dashboard/charts'),
  getDashboardRecent: () => api.get('/reports/dashboard/recent'),
  getPilots: (from?: string, to?: string) =>
    api.get('/reports/pilots', { params: { from, to } }),
  getPilotFlights: (pilotId: string, from?: string, to?: string) =>
    api.get(`/reports/pilots/${pilotId}/flights`, { params: { from, to } }),
  getRevenue: (from?: string, to?: string) =>
    api.get('/reports/revenue', { params: { from, to } }),
  getCustomers: (from?: string, to?: string) =>
    api.get('/reports/customers', { params: { from, to } }),
  getDaily: (date: string) => api.get(`/reports/daily/${date}`),
  getCompare: (period1_from: string, period1_to: string, period2_from: string, period2_to: string) =>
    api.get('/reports/compare', { params: { period1_from, period1_to, period2_from, period2_to } }),
  getSystem: () => api.get('/reports/system'),
}

// Settings API (Super Admin için)
export const settingsApi = {
  get: (key: string) => api.get(`/settings/${key}`),
  set: (key: string, value: string | number) => api.patch(`/settings/${key}`, { value }),
  setPilotFee: (pilotId: string, fee: number | null) =>
    api.patch(`/settings/pilots/${pilotId}/fee`, { fee }),
}

// OS algılamalı SMB/UNC klasör açma helper
export function openNetworkFolder(data: { smbPath?: string; uncPath?: string }) {
  const ua = navigator.userAgent
  const isWindows = /Windows/.test(ua)
  if (isWindows && data.uncPath) {
    // Windows: skytrack: custom protocol → C:\SkyTrack\skytrack-open.bat → explorer.exe
    // Backslash → forward slash (URL'de backslash sorun yapar, bat'ta geri çeviriyoruz)
    const safePath = data.uncPath.replace(/\\/g, '/')
    window.location.href = `skytrack:${safePath}`
  } else if (data.smbPath) {
    window.open(data.smbPath)
  }
}
