// AirPrint native bridge wrapper
// AppDelegate.swift WKScriptMessageHandler üzerinden çalışır

declare global {
  interface Window {
    _nativeAirPrint?: (html: string, jobName?: string) => Promise<{ completed?: boolean; cancelled?: boolean }>
  }
}

export const AirPrint = {
  async print(options: { html: string; jobName?: string }) {
    if (typeof window._nativeAirPrint === 'function') {
      return window._nativeAirPrint(options.html, options.jobName)
    }
    throw new Error('AirPrint bridge not available')
  }
}
