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
}

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
  paths: (): Promise<{ dataDir: string; dataFile: string; platform: string; home: string }> =>
    ipcRenderer.invoke('app:paths'),
}

contextBridge.exposeInMainWorld('suixinji', api)

export type SuixinjiApi = typeof api
