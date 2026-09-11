import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

// CJS bundle: __dirname is provided by Node
declare const __dirname: string

const isDev = !app.isPackaged
let win: BrowserWindow | null = null
let tray: Tray | null = null

const DATA_DIR = path.join(app.getPath('userData'), 'suixinji')
const DATA_FILE = path.join(DATA_DIR, 'data.json')
const WIN_FILE = path.join(DATA_DIR, 'window.json')

type Store = {
  entries: unknown[]
  settings: Record<string, unknown>
}

function ensureStore(): Store {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  } catch {
    /* ignore */
  }
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

function saveWindowState() {
  if (!win || win.isDestroyed()) return
  const b = win.getBounds()
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(WIN_FILE, JSON.stringify(b, null, 2), 'utf-8')
  } catch {
    /* ignore */
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
    title: '随心记',
    icon: resolveAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces?.(true, { visibleOnFullScreen: true })

  if (isDev) {
    void win.loadURL('http://localhost:5173')
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.once('ready-to-show', () => {
    win?.show()
  })

  win.on('moved', saveWindowState)
  win.on('resized', saveWindowState)

  win.on('closed', () => {
    win = null
  })
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
      label: '显示 / 隐藏',
      click: () => {
        if (!win) return
        if (win.isVisible()) win.hide()
        else {
          win.show()
          win.focus()
        }
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

function registerIpc() {
  ipcMain.handle('store:load', () => ensureStore())

  ipcMain.handle('store:save', (_e, payload: Store) => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
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
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  ipcMain.handle('win:drag-start', () => {
    // handled in renderer via CSS -webkit-app-region; kept for future
  })

  ipcMain.handle('win:set-always-on-top', (_e, flag: boolean) => {
    win?.setAlwaysOnTop(Boolean(flag), 'screen-saver')
    return Boolean(flag)
  })

  ipcMain.handle('win:set-opacity', (_e, value: number) => {
    const v = Math.min(1, Math.max(0.35, Number(value) || 1))
    win?.setOpacity(v)
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
    platform: process.platform,
    home: os.homedir(),
  }))
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // keep tray app alive on Windows unless explicitly quit
  if (process.platform !== 'darwin') {
    // do not quit — tray keeps it living; user exits via tray menu
  }
})

app.on('before-quit', saveWindowState)
