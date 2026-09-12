param([Int64]$Hwnd = 0)
if ($Hwnd -eq 0) { exit 1 }

Add-Type -Namespace W -Name N -MemberDefinition @'
[DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr h,int a,ref int v,int s);
[DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h,int i);
[DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr h,int i,int v);
[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,int a,int x,int y,int cx,int cy,uint f);
[DllImport("gdi32.dll")] public static extern int CreateRectRgn(int x1,int y1,int x2,int y2);
[DllImport("user32.dll")] public static extern int SetWindowRgn(IntPtr h,int rgn,bool redraw);
'@

$h = [IntPtr]$Hwnd

# 1) Win10/11: 不要系统圆角
$corner = 1
[W.N]::DwmSetWindowAttribute($h, 33, [ref]$corner, 4) | Out-Null

# 2) 强制成弹出式无边框（Win10 透明窗顶灰条多来自残留 caption）
$WS_POPUP      = 0x80000000
$WS_VISIBLE    = 0x10000000
$WS_CLIPSIBLINGS = 0x04000000
$WS_CLIPCHILDREN = 0x02000000
$WS_THICKFRAME = 0x00040000
$WS_SYSMENU    = 0x00080000
$WS_CAPTION    = 0x00C00000
$WS_BORDER     = 0x00800000
$WS_DLGFRAME   = 0x00400000

# 默认：完全无边框；若原样式含 THICKFRAME（可缩放窗）则保留
$old = [W.N]::GetWindowLong($h, -16)
$keepThick = ($old -band $WS_THICKFRAME) -ne 0

$new = [int]($WS_POPUP -bor $WS_VISIBLE -bor $WS_CLIPSIBLINGS -bor $WS_CLIPCHILDREN)
if ($keepThick) { $new = $new -bor $WS_THICKFRAME }
# 显式清掉 caption/sysmenu/border
$new = $new -band (-bnot $WS_CAPTION) -band (-bnot $WS_SYSMENU) -band (-bnot $WS_BORDER) -band (-bnot $WS_DLGFRAME)

[W.N]::SetWindowLong($h, -16, $new) | Out-Null

# 3) 通知系统重算边框
# SWP_NOSIZE|NOMOVE|NOZORDER|NOACTIVATE|FRAMECHANGED = 0x37
[W.N]::SetWindowPos($h, 0, 0, 0, 0, 0, 0x37) | Out-Null

exit 0
