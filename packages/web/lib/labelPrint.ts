/**
 * Thermal label printing utility for Xprinter XP-490B
 * Label size: 40mm x 60mm (portrait — 40 wide, 60 tall)
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

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Etiket - ${data.displayId}</title>
<style>
  @page {
    size: 40mm 60mm;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 40mm;
    height: 60mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  .label {
    width: 40mm;
    height: 60mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2mm;
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
  }
  .qr-top {
    flex-shrink: 0;
  }
  .qr-top img {
    width: 24mm;
    height: 24mm;
  }
  .display-id {
    font-size: 14pt;
    font-weight: bold;
    letter-spacing: 1px;
    margin-top: 0.5mm;
    line-height: 1;
  }
  .customer-name {
    font-size: 7pt;
    color: #444;
    margin-top: 0.5mm;
    line-height: 1.1;
    max-width: 36mm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pilot-name {
    font-size: 7pt;
    font-weight: bold;
    color: #000;
    margin-top: 0.3mm;
    line-height: 1.1;
    max-width: 36mm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .datetime {
    font-size: 5.5pt;
    color: #888;
    margin-top: 0.5mm;
    line-height: 1;
  }
  @media print {
    html, body { margin: 0; padding: 0; }
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
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  const img = printWindow.document.querySelector('img')
  const doPrint = () => {
    printWindow.focus()
    printWindow.print()
  }
  if (img && !img.complete) {
    img.addEventListener('load', () => setTimeout(doPrint, 100))
    img.addEventListener('error', () => setTimeout(doPrint, 100))
  } else {
    printWindow.onload = () => setTimeout(doPrint, 100)
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
