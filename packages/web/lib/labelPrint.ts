/**
 * Thermal label printing utility for Xprinter XP-490B
 * Label size: 40mm x 60mm (portrait)
 * 203 DPI: 40mm = 320px, 60mm = 480px
 */

export interface LabelData {
  qrCode: string        // QR code as data URL
  displayId: string     // e.g. "T0060"
  customerName: string  // "Elas Aidukas"
  pilotName?: string    // "Mehmet Ermetin"
}

function buildLabelHtml(data: LabelData): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // Single self-contained page — image-based label
  // No @page size: let the printer use its own configured label size
  // Content is absolutely sized to fit 40x60mm at any DPI
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Etiket</title>
<style>
  @page {
    size: 40mm 60mm;
    margin: 0 !important;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 40mm;
    height: 60mm;
    margin: 0 !important;
    padding: 0;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .label {
    width: 40mm;
    height: 60mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5mm;
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
    page-break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .qr-top img {
    width: 22mm;
    height: 22mm;
    display: block;
  }
  .display-id {
    font-size: 13pt;
    font-weight: bold;
    letter-spacing: 1px;
    margin-top: 0.5mm;
    line-height: 1;
  }
  .customer-name {
    font-size: 6.5pt;
    color: #333;
    margin-top: 0.5mm;
    line-height: 1;
    max-width: 36mm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pilot-name {
    font-size: 6.5pt;
    font-weight: bold;
    margin-top: 0.3mm;
    line-height: 1;
    max-width: 36mm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .datetime {
    font-size: 5pt;
    color: #666;
    margin-top: 0.5mm;
    line-height: 1;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 40mm;
      height: 60mm;
    }
  }
</style>
</head>
<body>
<div class="label">
  <div class="qr-top">
    <img src="${data.qrCode}" alt="QR" />
  </div>
  <div class="display-id">${data.displayId}</div>
  <div class="customer-name">${data.customerName}</div>
  ${data.pilotName ? `<div class="pilot-name">Pilot: ${data.pilotName}</div>` : ''}
  <div class="datetime">${dateStr} ${timeStr}</div>
</div>
</body>
</html>`
}

/** Print a single label via browser popup window */
export function printLabel(data: LabelData): void {
  const html = buildLabelHtml(data)
  const printWindow = window.open('', '_blank', 'width=300,height=400')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  const img = printWindow.document.querySelector('img')
  const doPrint = () => {
    printWindow.focus()
    printWindow.print()
  }
  if (img && !img.complete) {
    img.addEventListener('load', () => setTimeout(doPrint, 200))
    img.addEventListener('error', () => setTimeout(doPrint, 200))
  } else {
    printWindow.onload = () => setTimeout(doPrint, 200)
  }
}

/** Print a label via hidden iframe (for kiosk/auto-print) */
export function printLabelIframe(data: LabelData): void {
  const html = buildLabelHtml(data)

  const existing = document.getElementById('label-print-frame')
  if (existing) existing.remove()

  const iframe = document.createElement('iframe')
  iframe.id = 'label-print-frame'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return
  doc.open()
  doc.write(html)
  doc.close()

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (err) {
      console.error('[LabelPrint] iframe print hatası:', err)
    }
    setTimeout(() => { try { iframe.remove() } catch {} }, 3000)
  }

  const img = doc.querySelector('img')
  if (img && !img.complete) {
    img.addEventListener('load', () => setTimeout(triggerPrint, 150))
    img.addEventListener('error', () => setTimeout(triggerPrint, 150))
  } else {
    setTimeout(triggerPrint, 300)
  }
}

/** Build label HTML (for native AirPrint integration) */
export function buildLabelPrintHtml(data: LabelData): string {
  return buildLabelHtml(data)
}
