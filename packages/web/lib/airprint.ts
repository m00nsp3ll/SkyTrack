// AirPrint native bridge wrapper
// AppDelegate.swift WKScriptMessageHandler üzerinden çalışır (Capacitor plugin değil)
// window._nativeAirPrint fonksiyonu native taraftan inject edilir

declare global {
  interface Window {
    _nativeAirPrint?: (html: string, jobName?: string) => Promise<{ completed?: boolean; cancelled?: boolean }>
  }
}

export interface AirPrintPlugin {
  print(options: { html: string; jobName?: string }): Promise<{ completed?: boolean; cancelled?: boolean }>
}

export const AirPrint: AirPrintPlugin = {
  async print(options) {
    if (typeof window._nativeAirPrint === 'function') {
      return window._nativeAirPrint(options.html, options.jobName)
    }
    throw new Error('AirPrint bridge not available — native iOS app required')
  }
}
