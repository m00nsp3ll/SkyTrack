/**
 * Thermal label printing utility
 * Supports Brother QL-810W (58x58mm) and similar label printers
 * Layout: date top, QR center, ID+name+pilot bottom
 */

export interface LabelData {
  qrCode: string
  displayId: string
  customerName: string
  pilotName?: string
}

function buildLabelHtml(data: LabelData): string {
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
    size: 58mm 58mm;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 58mm; height: 58mm;
    margin: 0; padding: 0;
    overflow: hidden;
  }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .label {
    width: 54mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1mm;
  }
  .dt {
    font-size: 11pt;
    font-weight: bold;
    color: #000;
  }
  .qr img {
    width: 32mm;
    height: 32mm;
    display: block;
    image-rendering: pixelated;
  }
  .info {
    font-size: 10pt;
    font-weight: bold;
    color: #000;
    line-height: 1.3;
  }
  .pilot {
    font-size: 10pt;
    font-weight: bold;
    color: #000;
  }
</style>
</head>
<body>
<div class="label">
  <div class="dt">${dateStr} - ${timeStr}</div>
  <div class="qr"><img src="${data.qrCode}" /></div>
  <div class="info">${data.displayId} - ${data.customerName}</div>
  ${data.pilotName ? `<div class="pilot">Pilot: ${data.pilotName}</div>` : ''}
</div>
</body>
</html>`
}

export function printLabel(data: LabelData): void {
  const html = buildLabelHtml(data)
  const w = window.open('', '_blank', 'width=300,height=400')
  if (!w) return
  w.document.write(html)
  w.document.close()
  const img = w.document.querySelector('img')
  const go = () => { w.focus(); w.print() }
  if (img && !img.complete) {
    img.onload = () => setTimeout(go, 150)
    img.onerror = () => setTimeout(go, 150)
  } else {
    w.onload = () => setTimeout(go, 150)
  }
}

export function printLabelIframe(data: LabelData): void {
  const html = buildLabelHtml(data)
  const old = document.getElementById('lbl-frame')
  if (old) old.remove()
  const f = document.createElement('iframe')
  f.id = 'lbl-frame'
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(f)
  const d = f.contentDocument || f.contentWindow?.document
  if (!d) return
  d.open(); d.write(html); d.close()
  const go = () => {
    try { f.contentWindow?.focus(); f.contentWindow?.print() } catch {}
    setTimeout(() => { try { f.remove() } catch {} }, 3000)
  }
  const img = d.querySelector('img')
  if (img && !img.complete) {
    img.onload = () => setTimeout(go, 150)
    img.onerror = () => setTimeout(go, 150)
  } else { setTimeout(go, 300) }
}

export function buildLabelPrintHtml(data: LabelData): string {
  return buildLabelHtml(data)
}
