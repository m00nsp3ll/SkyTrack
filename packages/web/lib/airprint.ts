// AirPrint native plugin wrapper
// AppDelegate.swift içinde tanımlı AirPrintPlugin'i çağırır (iOS Capacitor)
// Android ve web'de çalışmaz — çağıran taraf Capacitor.isNativePlatform() kontrol etmeli

import { registerPlugin } from '@capacitor/core'

export interface AirPrintPlugin {
  print(options: { html: string; jobName?: string }): Promise<{ completed?: boolean; cancelled?: boolean }>
}

export const AirPrint = registerPlugin<AirPrintPlugin>('AirPrint')
