param([string]$url)
$log = "C:\SkyTrack\skytrack-open.log"
try {
  Add-Content $log "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') IN: [$url]"
  $p = $url -replace '(?i)^skytrack:(//)?', ''
  $p = [Uri]::UnescapeDataString($p)
  $p = $p.TrimEnd('/', '\') -replace '/', '\'
  $final = "\\$p"
  Add-Content $log "    OUT: [$final]"
  if (Test-Path $final) {
    Start-Process explorer.exe -ArgumentList "`"$final`""
  } else {
    Add-Content $log "    NOT FOUND"
    [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
    [System.Windows.Forms.MessageBox]::Show("Klasor bulunamadi:`n$final", "SkyTrack") | Out-Null
  }
} catch {
  Add-Content $log "    ERR: $_"
}
