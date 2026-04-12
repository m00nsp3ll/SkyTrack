// AirPrint native bridge wrapper
// AppDelegate.swift WKScriptMessageHandler üzerinden çalışır
// window._nativeAirPrint fonksiyonu native taraftan inject edilir

declare global {
  interface Window {
    _nativeAirPrint?: (html: string, jobName?: string, auto?: boolean) => Promise<{ completed?: boolean; cancelled?: boolean }>
  }
}

export interface AirPrintPlugin {
  print(options: { html: string; jobName?: string; auto?: boolean }): Promise<{ completed?: boolean; cancelled?: boolean }>
}

export const AirPrint: AirPrintPlugin = {
  async print(options) {
    if (typeof window._nativeAirPrint === 'function') {
      return window._nativeAirPrint(options.html, options.jobName, options.auto)
    }
    throw new Error('AirPrint bridge not available')
  }
}
