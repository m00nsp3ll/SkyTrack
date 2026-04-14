' SkyTrack hidden launcher — CMD/PS penceresi göstermez
Set args = WScript.Arguments
If args.Count = 0 Then WScript.Quit
arg = args(0)
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""C:\SkyTrack\skytrack-open.ps1"" """ & arg & """"
CreateObject("WScript.Shell").Run cmd, 0, False
