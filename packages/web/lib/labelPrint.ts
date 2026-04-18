/**
 * Thermal label printing utility for Xprinter XP-490B
 * Physical label: 60mm wide x 40mm tall (landscape)
 * No @page size — content compact enough to fit on label at any driver paper size
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
  @page { margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    overflow: hidden;
  }
  body {
    padding: 2px;
    font-family: Arial, sans-serif;
  }
  .label {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .qr img {
    width: 55px;
    height: 55px;
    display: block;
  }
  .info {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 4px;
    height: 55px;
  }
  .info-inner {
    transform: rotate(90deg);
    white-space: nowrap;
    text-align: center;
  }
  .id { font-size: 9px; font-weight: bold; }
  .name { font-size: 6px; color: #333; margin-top: 1px; }
  .pilot { font-size: 6px; font-weight: bold; margin-top: 1px; }
  .dt { font-size: 5px; color: #888; margin-top: 2px; }
</style>
</head>
<body>
<div class="label">
  <div class="qr"><img src="${data.qrCode}" /></div>
  <div class="info"><div class="info-inner">
    <div class="id">${data.displayId}</div>
    <div class="name">${data.customerName}</div>
    ${data.pilotName ? `<div class="pilot">Pilot: ${data.pilotName}</div>` : ''}
    <div class="dt">${dateStr} ${timeStr}</div>
  </div></div>
</div>
</body>
</html>`
}

export function printLabel(data: LabelData): void {
  const html = buildLabelHtml(data)
  const w = window.open('', '_blank', 'width=300,height=200')
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
