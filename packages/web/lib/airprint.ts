// AirPrint native plugin wrapper
// AppDelegate.swift içinde tanımlı AirPrintPlugin'i çağırır (iOS Capacitor)
// Android ve web'de çalışmaz — çağıran taraf Capacitor.isNativePlatform() kontrol etmeli

import { Capacitor, registerPlugin } from '@capacitor/core'

export interface AirPrintPlugin {
  print(options: { html: string; jobName?: string }): Promise<{ completed?: boolean; cancelled?: boolean }>
}

// Önce Capacitor.Plugins üzerinden dene (native bridge), sonra registerPlugin fallback
function getAirPrint(): AirPrintPlugin {
  const cap = (window as any).Capacitor
  if (cap?.Plugins?.AirPrint) {
    return cap.Plugins.AirPrint as AirPrintPlugin
  }
  return registerPlugin<AirPrintPlugin>('AirPrint')
}

export const AirPrint: AirPrintPlugin = {
  print: (options) => getAirPrint().print(options)
}
