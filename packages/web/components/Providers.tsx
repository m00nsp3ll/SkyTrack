'use client'

import { ReactNode } from 'react'
import { SocketProvider } from '@/contexts/SocketContext'
import { ToastProvider } from '@/components/ui/toast-provider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SocketProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </SocketProvider>
  )
}
