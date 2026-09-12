import { contextBridge, ipcRenderer } from 'electron'

export type Entry = {
  id: string
  kind: 'done' | 'note' | 'gratitude' | 'custom'
  text: string
  tags: string[]
  mood?: string
  done: boolean
  createdAt: string
  doneAt?: string
}

export type PetSettings = {
  petEnabled: boolean
  petImage: string | null
  petSize: number
  petAnimation: boolean
  petShowBadge: boolean
  petShape?: 'cutout' | 'circle'
}

export type Settings = {
  themeId: string
  accent: string
  size: 'S' | 'M' | 'L'
  alwaysOnTop: boolean
  opacity: number
  compact: boolean
  customKindLabel: string
  fontFamily: 'sans' | 'serif'
  showStats: boolean
  blur: number
} & PetSettings

export type StoreShape = {
  entries: Entry[]
  settings: Partial<Settings>
}

const api = {
  load: (): Promise<StoreShape> => ipcRenderer.invoke('store:load'),
  save: (payload: StoreShape): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('store:save', payload),
  setAlwaysOnTop: (flag: boolean): Promise<boolean> =>
    ipcRenderer.invoke('win:set-always-on-top', flag),
  setOpacity: (value: number): Promise<number> => ipcRenderer.invoke('win:set-opacity', value),
  minimize: (): Promise<void> => ipcRenderer.invoke('win:minimize'),
  close: (): Promise<void> => ipcRenderer.invoke('win:close'),
  quit: (): Promise<void> => ipcRenderer.invoke('win:quit'),
  paths: (): Promise<{
    dataDir: string
    dataFile: string
    petDir: string
    platform: string
    home: string
  }> => ipcRenderer.invoke('app:paths'),
  pickPetImage: (): Promise<string | null> => ipcRenderer.invoke('pet:pick-image'),
  setPetVisible: (flag: boolean): Promise<boolean> => ipcRenderer.invoke('pet:set-visible', flag),
  petToUrl: (filePath: string): Promise<string> => ipcRenderer.invoke('pet:to-url', filePath),
  onPetSettings: (cb: (payload: PetSettings) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: PetSettings) => cb(payload)
    ipcRenderer.on('pet:settings', listener)
    return () => {
      ipcRenderer.removeListener('pet:settings', listener)
    }
  },
  petDragStart: (): void => {
    ipcRenderer.send('pet:drag-start')
  },
  petDragMove: (screenX: number, screenY: number): void => {
    ipcRenderer.send('pet:drag-move', screenX, screenY)
  },
  petDragEnd: (): void => {
    ipcRenderer.send('pet:drag-end')
  },
  focusMainCard: (): Promise<void> => ipcRenderer.invoke('pet:open-main'),
}

contextBridge.exposeInMainWorld('suixinji', api)

export type SuixinjiApi = typeof api
