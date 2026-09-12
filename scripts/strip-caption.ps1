param([Int64]$Hwnd = 0)
if ($Hwnd -eq 0) { exit 1 }
Add-Type -Namespace W -Name N -MemberDefinition @'
[DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr h,int a,ref int v,int s);
[DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h,int i);
[DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr h,int i,int v);
[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,int a,int x,int y,int cx,int cy,uint f);
'@
$h = [IntPtr]$Hwnd
$c = 1
[W.N]::DwmSetWindowAttribute($h, 33, [ref]$c, 4) | Out-Null
$s = [W.N]::GetWindowLong($h, -16)
$s = $s -band (-bnot 0x00C00000) -band (-bnot 0x00080000)
[W.N]::SetWindowLong($h, -16, $s) | Out-Null
# SWP_NOSIZE|NOMOVE|NOZORDER|NOACTIVATE|FRAMECHANGED
[W.N]::SetWindowPos($h, 0, 0, 0, 0, 0, 0x37) | Out-Null
exit 0
