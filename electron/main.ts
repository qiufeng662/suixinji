import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog, protocol, net, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { pathToFileURL } from 'node:url'

// CJS bundle: __dirname is provided by Node
declare const __dirname: string

// Windows: Chromium 原生遮挡检测会把置顶小窗当成「被挡住」而降级
// 成熟桌面挂件（Rainmeter/Electron widget 类）都会关掉这个特性
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')
app.commandLine.appendSwitch('enable-transparent-visuals')

const isDev = !app.isPackaged
let win: BrowserWindow | null = null
let petWin: BrowserWindow | null = null
let tray: Tray | null = null

// 避免主进程未捕获异常弹出系统错误框（坐标/窗口 API 偶发 conversion failure）
process.on('uncaughtException', (err) => {
  console.error('[suixinji]', err)
})

const DATA_DIR = path.join(app.getPath('userData'), 'suixinji')
const DATA_FILE = path.join(DATA_DIR, 'data.json')
const WIN_FILE = path.join(DATA_DIR, 'window.json')
const PET_FILE = path.join(DATA_DIR, 'pet-window.json')
const PET_IMG_DIR = path.join(DATA_DIR, 'pets')

type Store = {
  entries: unknown[]
  settings: Record<string, unknown>
}

function ensureDirs() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.mkdirSync(PET_IMG_DIR, { recursive: true })
  } catch {
    /* ignore */
  }
}

function ensureStore(): Store {
  ensureDirs()
  if (!fs.existsSync(DATA_FILE)) {
    const init: Store = { entries: [], settings: {} }
    fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2), 'utf-8')
    return init
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as Store
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
    }
  } catch {
    return { entries: [], settings: {} }
  }
}

function loadWindowState() {
  try {
    if (fs.existsSync(WIN_FILE)) {
      return JSON.parse(fs.readFileSync(WIN_FILE, 'utf-8')) as {
        x: number
        y: number
        width: number
        height: number
      }
    }
  } catch {
    /* ignore */
  }
  const { workArea } = screen.getPrimaryDisplay()
  return {
    x: workArea.x + workArea.width - 380,
    y: workArea.y + 48,
    width: 360,
    height: 560,
  }
}

function loadPetWindowState() {
  try {
    if (fs.existsSync(PET_FILE)) {
      return JSON.parse(fs.readFileSync(PET_FILE, 'utf-8')) as {
        x: number
        y: number
        width: number
        height: number
      }
    }
  } catch {
    /* ignore */
  }
  const { workArea } = screen.getPrimaryDisplay()
  return {
    x: workArea.x + workArea.width - 200,
    y: workArea.y + workArea.height - 220,
    width: 160,
    height: 180,
  }
}

function saveWindowState() {
  if (win && !win.isDestroyed()) {
    const b = win.getBounds()
    try {
      ensureDirs()
      fs.writeFileSync(WIN_FILE, JSON.stringify(b, null, 2), 'utf-8')
    } catch {
      /* ignore */
    }
  }
  if (petWin && !petWin.isDestroyed()) {
    const b = petWin.getBounds()
    try {
      ensureDirs()
      fs.writeFileSync(PET_FILE, JSON.stringify(b, null, 2), 'utf-8')
    } catch {
      /* ignore */
    }
  }
}

function resolveAppIcon(): string | undefined {
  const candidates = [
    path.join(process.resourcesPath, 'icon.png'),
    path.join(__dirname, '../build/icon.png'),
    path.join(app.getAppPath(), 'build/icon.png'),
  ]
  return candidates.find((p) => fs.existsSync(p))
}

function forceTop(w: BrowserWindow | null, flag = true) {
  if (!w || w.isDestroyed()) return
  try {
    // pop-up-menu / screen-saver 均为 TOPMOST 级；交替使用提高存活率
    w.setAlwaysOnTop(flag, flag ? 'screen-saver' : 'normal')
    if (flag) {
      w.setVisibleOnAllWorkspaces?.(true, { visibleOnFullScreen: true })
      w.moveTop()
    }
  } catch {
    /* ignore */
  }
}

/** Windows 上置顶有时会被全屏/UAC/Chromium 遮挡检测抢走，高频加固 */
let topTimer: NodeJS.Timeout | null = null
function startTopKeeper() {
  if (topTimer) return
  topTimer = setInterval(() => {
    const petTop = ensureStore().settings.petAlwaysOnTop !== false
    const cardTop = ensureStore().settings.alwaysOnTop !== false
    if (petWin && !petWin.isDestroyed() && petWin.isVisible()) {
      if (petTop) forceTop(petWin)
      stripCaption(petWin)
    }
    if (win && !win.isDestroyed() && win.isVisible()) {
      if (cardTop) forceTop(win)
      stripCaption(win)
    }
  }, 800)
}

function stopTopKeeper() {
  if (topTimer) clearInterval(topTimer)
  topTimer = null
}

function stripChromeArtifacts(w: BrowserWindow | null) {
  if (!w || w.isDestroyed()) return
  try {
    w.setBackgroundColor('#00000000')
  } catch {
    /* ignore */
  }
  try {
    w.setMenu(null)
  } catch {
    /* ignore */
  }
  if (process.platform === 'win32') {
    setWinOpacity(w, 0.98)
    setTimeout(() => setWinOpacity(w, 1), 40)
    stripCaption(w)
  }
}

function resolveStripScript(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'strip-caption.ps1'),
    path.join(app.getAppPath(), 'scripts', 'strip-caption.ps1'),
    path.join(path.dirname(app.getPath('exe')), 'resources', 'strip-caption.ps1'),
    path.join(path.dirname(app.getPath('exe')), 'strip-caption.ps1'),
  ]
  return candidates.find((p) => {
    try {
      return fs.existsSync(p)
    } catch {
      return false
    }
  }) ?? null
}

/** Win10/11 透明无边框窗顶部通栏灰条 = 残留 caption，强制改 WS_POPUP */
function stripCaption(w: BrowserWindow) {
  try {
    const buf = w.getNativeWindowHandle()
    const hwnd = Number(buf.readBigUInt64LE(0))
    const file = resolveStripScript()
    if (!file) return
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file, '-Hwnd', String(hwnd)],
      () => {
        /* ignore */
      },
    )
  } catch {
    /* ignore */
  }
}

function createWindow() {
  const bounds = loadWindowState()

  win = new BrowserWindow({
    ...bounds,
    minWidth: 300,
    minHeight: 420,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    title: ' ',
    autoHideMenuBar: true,
    icon: resolveAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  try {
    win.setMenu(null)
  } catch {
    /* ignore */
  }

  forceTop(win)
  try {
    win.setTitle(' ')
  } catch {
    /* ignore */
  }

  if (isDev) {
    void win.loadURL('http://localhost:5173/')
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.once('ready-to-show', () => {
    win?.show()
    forceTop(win)
    stripChromeArtifacts(win)
  })

  win.on('moved', saveWindowState)
  win.on('resized', saveWindowState)
  win.on('blur', () => forceTop(win))

  win.on('closed', () => {
    win = null
  })
}

function petEnabledFromStore(): boolean {
  const s = ensureStore().settings
  return s.petEnabled !== false
}

function createPetWindow() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.show()
    return petWin
  }
  const bounds = loadPetWindowState()
  const size = Math.max(100, Math.min(240, Number(ensureStore().settings.petSize) || 160))
  const shape = ensureStore().settings.petShape === 'circle' ? 'circle' : 'cutout'
  const w = shape === 'circle' ? size : Math.round(size * 0.85)
  const h = shape === 'circle' ? size + 20 : Math.round(size * 1.35)

  petWin = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: w,
    height: h,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    thickFrame: false,
    title: ' ',
    autoHideMenuBar: true,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    icon: resolveAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  try {
    petWin.setMenu(null)
  } catch {
    /* ignore */
  }

  forceTop(petWin)
  try {
    petWin.setTitle(' ')
  } catch {
    /* ignore */
  }

  if (isDev) {
    void petWin.loadURL('http://localhost:5173/pet.html')
  } else {
    void petWin.loadFile(path.join(__dirname, '../dist/pet.html'))
  }

  petWin.once('ready-to-show', () => {
    if (petEnabledFromStore()) {
      petWin?.show()
      forceTop(petWin)
      stripChromeArtifacts(petWin)
    }
  })

  petWin.on('moved', saveWindowState)
  petWin.on('blur', () => forceTop(petWin))
  petWin.on('closed', () => {
    petWin = null
  })

  return petWin
}

function setPetVisible(flag: boolean) {
  if (flag) {
    if (!petWin || petWin.isDestroyed()) createPetWindow()
    else {
      petWin.show()
      forceTop(petWin)
      stripChromeArtifacts(petWin)
    }
  } else {
    petWin?.hide()
  }
}

function safeInt(n: unknown, fallback = 0): number {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? v : fallback
}

function safeOpacity(n: unknown, fallback = 1): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(1, Math.max(0.35, v))
}

function setWinOpacity(w: BrowserWindow | null, value: number) {
  if (!w || w.isDestroyed()) return
  try {
    w.setOpacity(safeOpacity(value))
  } catch {
    /* ignore */
  }
}

function setWinPos(w: BrowserWindow | null, x: number, y: number) {
  if (!w || w.isDestroyed()) return
  const nx = safeInt(x, NaN)
  const ny = safeInt(y, NaN)
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return
  try {
    w.setPosition(nx, ny)
  } catch {
    /* ignore */
  }
}

function setWinBounds(w: BrowserWindow | null, x: number, y: number, width: number, height: number) {
  if (!w || w.isDestroyed()) return
  const nx = safeInt(x)
  const ny = safeInt(y)
  const nw = safeInt(width)
  const nh = safeInt(height)
  if (nw < 40 || nh < 40) return
  try {
    w.setBounds({ x: nx, y: ny, width: nw, height: nh })
  } catch {
    /* ignore */
  }
}

function snapPetToEdge() {
  if (!petWin || petWin.isDestroyed()) return
  const b = petWin.getBounds()
  const display = screen.getDisplayNearestPoint({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
  const wa = display.workArea
  const threshold = 36
  let { x, y } = b
  if (Math.abs(x - wa.x) < threshold) x = wa.x
  if (Math.abs(x + b.width - (wa.x + wa.width)) < threshold) x = wa.x + wa.width - b.width
  if (Math.abs(y - wa.y) < threshold) y = wa.y
  if (Math.abs(y + b.height - (wa.y + wa.height)) < threshold) y = wa.y + wa.height - b.height
  setWinPos(petWin, x, y)
  saveWindowState()
}

function applyPetChrome(settings: Record<string, unknown>) {
  if (!petWin || petWin.isDestroyed()) return
  const top = settings.petAlwaysOnTop !== false
  forceTop(petWin, top)
  const through = settings.petClickThrough === true
  try {
    petWin.setIgnoreMouseEvents(through, { forward: true })
  } catch {
    /* ignore */
  }
}

function broadcastPetSettings(settings: Record<string, unknown>) {
  const payload = {
    petEnabled: settings.petEnabled !== false,
    petImage: typeof settings.petImage === 'string' ? settings.petImage : null,
    petSize: Number(settings.petSize) || 180,
    petAnimation: settings.petAnimation !== false,
    petShowBadge: settings.petShowBadge !== false,
    petShape: settings.petShape === 'circle' ? 'circle' : 'cutout',
    petAlwaysOnTop: settings.petAlwaysOnTop !== false,
    petLockPosition: settings.petLockPosition === true,
    petClickThrough: settings.petClickThrough === true,
  }
  applyPetChrome(settings)
  petWin?.webContents.send('pet:settings', payload)
  if (win && !win.isDestroyed()) {
    win.webContents.send('pet:settings', payload)
  }
}

function createTray() {
  const iconCandidates = [
    path.join(process.resourcesPath, 'icon.png'),
    path.join(__dirname, '../build/icon.png'),
    path.join(app.getAppPath(), 'build/icon.png'),
  ]
  let img: Electron.NativeImage | null = null
  for (const p of iconCandidates) {
    if (fs.existsSync(p)) {
      img = nativeImage.createFromPath(p).resize({ width: 16, height: 16 })
      break
    }
  }
  if (!img || img.isEmpty()) {
    const size = 16
    const buf = Buffer.alloc(size * size * 4)
    for (let i = 0; i < size * size; i++) {
      buf[i * 4] = 61
      buf[i * 4 + 1] = 90
      buf[i * 4 + 2] = 76
      buf[i * 4 + 3] = 255
    }
    img = nativeImage.createFromBuffer(buf, { width: size, height: size })
  }
  tray = new Tray(img)
  tray.setToolTip('随心记')
  const menu = Menu.buildFromTemplate([
    {
      label: '显示 / 隐藏卡片',
      click: () => {
        if (!win) return
        if (win.isVisible()) win.hide()
        else {
          win.show()
          win.focus()
        }
      },
    },
    {
      label: '显示 / 隐藏挂件',
      click: () => {
        if (petWin && !petWin.isDestroyed() && petWin.isVisible()) setPetVisible(false)
        else setPetVisible(true)
      },
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => {
    if (!win) return
    if (win.isVisible()) win.hide()
    else {
      win.show()
      win.focus()
    }
  })
}

function absPetPath(filePath: string): string {
  if (!filePath) return ''
  if (path.isAbsolute(filePath)) return filePath
  return path.join(PET_IMG_DIR, filePath)
}

function mimeFromPath(p: string): string {
  const ext = path.extname(p).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.bmp') return 'image/bmp'
  return 'image/jpeg'
}

function toPetImageUrl(filePath: string): string {
  if (!filePath) return ''
  if (filePath.startsWith('data:')) return filePath
  const abs = absPetPath(filePath)
  try {
    if (!fs.existsSync(abs)) return ''
    const buf = fs.readFileSync(abs)
    return `data:${mimeFromPath(abs)};base64,${buf.toString('base64')}`
  } catch {
    return ''
  }
}

function registerIpc() {
  ipcMain.handle('store:load', () => ensureStore())

  ipcMain.handle('store:save', (_e, payload: Store) => {
    try {
      ensureDirs()
      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
          {
            entries: Array.isArray(payload?.entries) ? payload.entries : [],
            settings: payload?.settings && typeof payload.settings === 'object' ? payload.settings : {},
          },
          null,
          2,
        ),
        'utf-8',
      )
      if (payload?.settings) {
        broadcastPetSettings(payload.settings as Record<string, unknown>)
        const petSize = safeInt((payload.settings as Record<string, unknown>).petSize, 180)
        const petShape =
          (payload.settings as Record<string, unknown>).petShape === 'circle' ? 'circle' : 'cutout'
        if (petWin && !petWin.isDestroyed() && petSize >= 100) {
          const b = petWin.getBounds()
          const w = petShape === 'circle' ? petSize : Math.round(petSize * 0.85)
          const h = petShape === 'circle' ? petSize + 20 : Math.round(petSize * 1.35)
          setWinBounds(petWin, b.x, b.y, w, h)
        }
      }
      const petOn = (payload?.settings as Record<string, unknown> | undefined)?.petEnabled !== false
      setPetVisible(petOn)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  ipcMain.handle('win:set-always-on-top', (_e, flag: boolean) => {
    forceTop(win, Boolean(flag))
    return Boolean(flag)
  })

  ipcMain.handle('win:set-opacity', (_e, value: number) => {
    const v = safeOpacity(value, 1)
    setWinOpacity(win, v)
    return v
  })

  ipcMain.handle('win:minimize', () => win?.minimize())
  ipcMain.handle('win:close', () => {
    saveWindowState()
    win?.hide()
    return true
  })
  ipcMain.handle('win:quit', () => {
    saveWindowState()
    app.quit()
  })

  ipcMain.handle('app:paths', () => ({
    dataDir: DATA_DIR,
    dataFile: DATA_FILE,
    petDir: PET_IMG_DIR,
    platform: process.platform,
    home: os.homedir(),
  }))

  ipcMain.handle('pet:pick-image', async () => {
    const owner = win && !win.isDestroyed() ? win : petWin && !petWin.isDestroyed() ? petWin : undefined
    const result = await dialog.showOpenDialog(owner ?? BrowserWindow.getAllWindows()[0]!, {
      title: '选择挂件照片',
      properties: ['openFile'],
      filters: [
        { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      ],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const src = result.filePaths[0]
    ensureDirs()
    const ext = path.extname(src).toLowerCase() || '.png'
    const dest = path.join(PET_IMG_DIR, `avatar${ext}`)
    try {
      fs.copyFileSync(src, dest)
    } catch {
      return null
    }
    return `avatar${ext}`
  })

  ipcMain.handle('pet:set-visible', (_e, flag: boolean) => {
    setPetVisible(Boolean(flag))
    return Boolean(flag)
  })

  ipcMain.handle('pet:to-url', (_e, filePath: string) => toPetImageUrl(String(filePath || '')))
  ipcMain.handle('pet:debug-path', (_e, filePath: string) => {
    const abs = absPetPath(String(filePath || ''))
    return { abs, exists: fs.existsSync(abs), size: fs.existsSync(abs) ? fs.statSync(abs).size : 0 }
  })

  let petDrag: { dx: number; dy: number } | null = null
  ipcMain.on('pet:drag-start', () => {
    if (!petWin || petWin.isDestroyed()) return
    if (ensureStore().settings.petLockPosition === true) return
    const c = screen.getCursorScreenPoint()
    const b = petWin.getBounds()
    petDrag = { dx: c.x - b.x, dy: c.y - b.y }
  })
  ipcMain.on('pet:drag-move', (_e, screenX: number, screenY: number) => {
    if (!petWin || petWin.isDestroyed() || !petDrag) return
    const sx = Number(screenX)
    const sy = Number(screenY)
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return
    setWinPos(petWin, sx - petDrag.dx, sy - petDrag.dy)
  })
  ipcMain.on('pet:drag-end', () => {
    petDrag = null
    const s = ensureStore().settings
    if (s.petLockPosition !== true) snapPetToEdge()
    saveWindowState()
    forceTop(petWin)
  })

  ipcMain.handle('pet:open-main', () => {
    if (!win || win.isDestroyed()) {
      createWindow()
      return
    }
    if (!win.isVisible()) win.show()
    win.focus()
    forceTop(win)
  })

  ipcMain.handle('pet:celebrate', () => {
    petWin?.webContents.send('pet:celebrate')
  })

  ipcMain.handle('pet:open-external', (_e, url: String) => shell.openExternal(String(url)))
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'petfile',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
])

app.whenReady().then(() => {
  // 关掉默认应用菜单，否则 Windows 上常在窗顶留一条菜单栏白条
  try {
    Menu.setApplicationMenu(null)
  } catch {
    /* ignore */
  }

  protocol.handle('petfile', (request) => {
    try {
      const u = new URL(request.url)
      // pathname like /C:/Users/... or /home/...
      let p = decodeURIComponent(u.pathname)
      if (/^\/[A-Za-z]:/.test(p)) p = p.slice(1)
      if (process.platform === 'win32') p = p.replace(/\//g, '\\')
      return net.fetch(pathToFileURL(p).href)
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })

  registerIpc()
  createWindow()
  createTray()
  if (petEnabledFromStore()) {
    createPetWindow()
    applyPetChrome(ensureStore().settings as Record<string, unknown>)
  }
  startTopKeeper()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      if (petEnabledFromStore()) createPetWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // keep tray app alive on Windows unless explicitly quit
})

app.on('before-quit', () => {
  stopTopKeeper()
  saveWindowState()
})
