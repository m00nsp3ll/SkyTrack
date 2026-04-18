/**
 * Thermal label printing utility for Xprinter XP-490B
 * Paper size: 2x4 in (50.8mm x 101.6mm) — closest available in driver
 * Physical label: ~40mm x 60mm
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

  // Paper: 2x4 in portrait — content rotated 90° to appear landscape
  // Uses transform on a fixed-size container to avoid 2-page issue
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Etiket</title>
<style>
  @page {
    size: 2in 4in;
    margin: 0 !important;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 2in;
    height: 4in;
    margin: 0 !important;
    padding: 0;
    overflow: hidden !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    position: relative;
  }
  .label {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 3.6in;
    height: 1.8in;
    transform: translate(-50%, -50%) rotate(-90deg) scale(0.6);
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 2mm;
    font-family: Arial, Helvetica, sans-serif;
  }
  .qr-side {
    flex-shrink: 0;
    padding-right: 3mm;
  }
  .qr-side img {
    width: 35mm;
    height: 35mm;
    display: block;
  }
  .info-side {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
  }
  .display-id {
    font-size: 18pt;
    font-weight: bold;
    letter-spacing: 1px;
    line-height: 1;
  }
  .customer-name {
    font-size: 9pt;
    color: #333;
    margin-top: 1.5mm;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pilot-name {
    font-size: 9pt;
    font-weight: bold;
    margin-top: 1mm;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .datetime {
    font-size: 7pt;
    color: #666;
    margin-top: 1.5mm;
    line-height: 1;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 2in;
      height: 4in;
      overflow: hidden !important;
    }
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
    <div class="datetime">${dateStr} ${timeStr}</div>
  </div>
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

/**
 * Landscape label layout — 4x2 in (landscape)
 * QR on left, info on right
 */
function buildLabelHtmlLandscape(data: LabelData): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Etiket</title>
<style>
  @page {
    size: 4in 2in;
    margin: 0 !important;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 4in;
    height: 2in;
    margin: 0 !important;
    padding: 0;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .label {
    width: 4in;
    height: 2in;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 2mm;
    font-family: Arial, Helvetica, sans-serif;
    page-break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .qr-side {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-right: 3mm;
  }
  .qr-side img {
    width: 38mm;
    height: 38mm;
    display: block;
  }
  .info-side {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    overflow: hidden;
  }
  .display-id {
    font-size: 22pt;
    font-weight: bold;
    letter-spacing: 1px;
    line-height: 1;
  }
  .customer-name {
    font-size: 10pt;
    color: #333;
    margin-top: 1.5mm;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pilot-name {
    font-size: 10pt;
    font-weight: bold;
    margin-top: 1mm;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .datetime {
    font-size: 7pt;
    color: #666;
    margin-top: 1.5mm;
    line-height: 1;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 4in;
      height: 2in;
    }
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
    <div class="datetime">${dateStr} ${timeStr}</div>
  </div>
</div>
</body>
</html>`
}

/**
 * Landscape label with 90° rotated text
 * Paper: 4x2 in — QR left, text rotated 90° on right
 */
function buildLabelHtmlLandscapeRotated(data: LabelData): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Etiket</title>
<style>
  @page {
    size: 4in 2in;
    margin: 0 !important;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 4in;
    height: 2in;
    margin: 0 !important;
    padding: 0;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .label {
    width: 4in;
    height: 2in;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 2mm;
    font-family: Arial, Helvetica, sans-serif;
    page-break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .qr-side {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qr-side img {
    width: 38mm;
    height: 38mm;
    display: block;
  }
  .info-side {
    flex: 1;
    height: 2in;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .info-rotated {
    transform: rotate(-90deg);
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .display-id {
    font-size: 20pt;
    font-weight: bold;
    letter-spacing: 1px;
    line-height: 1;
  }
  .customer-name {
    font-size: 9pt;
    color: #333;
    margin-top: 1.5mm;
    line-height: 1.1;
  }
  .pilot-name {
    font-size: 9pt;
    font-weight: bold;
    margin-top: 1mm;
    line-height: 1.1;
  }
  .datetime {
    font-size: 7pt;
    color: #666;
    margin-top: 1.5mm;
    line-height: 1;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 4in;
      height: 2in;
    }
  }
</style>
</head>
<body>
<div class="label">
  <div class="qr-side">
    <img src="${data.qrCode}" alt="QR" />
  </div>
  <div class="info-side">
    <div class="info-rotated">
      <div class="display-id">${data.displayId}</div>
      <div class="customer-name">${data.customerName}</div>
      ${data.pilotName ? `<div class="pilot-name">Pilot: ${data.pilotName}</div>` : ''}
      <div class="datetime">${dateStr} ${timeStr}</div>
    </div>
  </div>
</div>
</body>
</html>`
}

/** Print landscape rotated label via browser popup */
export function printLabelLandscapeRotated(data: LabelData): void {
  const html = buildLabelHtmlLandscapeRotated(data)
  const printWindow = window.open('', '_blank', 'width=400,height=300')
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

/** Print landscape label via browser popup */
export function printLabelLandscape(data: LabelData): void {
  const html = buildLabelHtmlLandscape(data)
  const printWindow = window.open('', '_blank', 'width=400,height=300')
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
