/**
 * Thermal label printing utility for Xprinter XP-490B
 * Label size: 60mm x 40mm (landscape)
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
    size: 60mm 40mm;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 60mm;
    height: 40mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  .label {
    width: 60mm;
    height: 40mm;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 2mm;
    font-family: Arial, Helvetica, sans-serif;
  }
  .qr-side {
    flex-shrink: 0;
    width: 34mm;
    height: 36mm;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qr-side img {
    width: 34mm;
    height: 34mm;
  }
  .info-side {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding-left: 1mm;
    overflow: hidden;
  }
  .display-id {
    font-size: 16pt;
    font-weight: bold;
    letter-spacing: 1px;
    line-height: 1.1;
  }
  .customer-name {
    font-size: 8pt;
    color: #444;
    margin-top: 1mm;
    line-height: 1.2;
    max-width: 22mm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pilot-name {
    font-size: 8pt;
    font-weight: bold;
    color: #000;
    margin-top: 1mm;
    line-height: 1.2;
    max-width: 22mm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .datetime {
    font-size: 6pt;
    color: #888;
    margin-top: 1.5mm;
    line-height: 1.1;
  }
  @media print {
    html, body { margin: 0; padding: 0; }
  }
</style>
</head>
<body>
<div class="label">
  <div class="qr-side">
    <img src="${data.qrCode}" alt="QR" />
  </div>
  <div class="info-side">
    <div class="display-id">${data.displayId}</div>
    <div class="customer-name">${data.customerName}</div>
    ${data.pilotName ? `<div class="pilot-name">Pilot: ${data.pilotName}</div>` : ''}
    <div class="datetime">${dateStr}<br/>${timeStr}</div>
  </div>
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

/**
 * Design B: Landscape paper, rotated text (vertical/portrait reading)
 * Paper feeds landscape (60mm x 40mm) but content is rotated 90°
 * so when you peel the label, you read it portrait-style
 */
function buildLabelHtmlRotated(data: LabelData): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Etiket B - ${data.displayId}</title>
<style>
  @page {
    size: 60mm 40mm;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 60mm;
    height: 40mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  .label {
    width: 60mm;
    height: 40mm;
    position: relative;
  }
  .rotated {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 40mm;
    height: 60mm;
    transform: translate(-50%, -50%) rotate(-90deg);
    transform-origin: center center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
    padding: 2mm;
  }
  .qr-top {
    flex-shrink: 0;
  }
  .qr-top img {
    width: 26mm;
    height: 26mm;
  }
  .display-id {
    font-size: 14pt;
    font-weight: bold;
    letter-spacing: 1px;
    margin-top: 1mm;
    line-height: 1.1;
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
    margin-top: 0.5mm;
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
    line-height: 1.1;
  }
  @media print {
    html, body { margin: 0; padding: 0; }
  }
</style>
</head>
<body>
<div class="label">
  <div class="rotated">
    <div class="qr-top">
      <img src="${data.qrCode}" alt="QR" />
    </div>
    <div class="display-id">${data.displayId}</div>
    <div class="customer-name">${data.customerName}</div>
    ${data.pilotName ? `<div class="pilot-name">Pilot: ${data.pilotName}</div>` : ''}
    <div class="datetime">${dateStr} - ${timeStr}</div>
  </div>
</div>
</body>
</html>`
}

/** Print Design B (rotated) via browser popup */
export function printLabelRotated(data: LabelData): void {
  const html = buildLabelHtmlRotated(data)
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
