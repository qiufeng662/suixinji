import type { Entry, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'

const LS_KEY = 'suixinji.local.v1'

type StoreShape = {
  entries: Entry[]
  settings: Partial<Settings>
}

function hasNative(): boolean {
  return typeof window !== 'undefined' && Boolean(window.suixinji)
}

function readLocal(): StoreShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { entries: [], settings: {} }
    const parsed = JSON.parse(raw) as StoreShape
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      settings: parsed.settings ?? {},
    }
  } catch {
    return { entries: [], settings: {} }
  }
}

function writeLocal(payload: StoreShape) {
  localStorage.setItem(LS_KEY, JSON.stringify(payload))
}

export async function loadStore(): Promise<{ entries: Entry[]; settings: Settings }> {
  if (hasNative()) {
    try {
      const data = await window.suixinji!.load()
      return {
        entries: Array.isArray(data.entries) ? (data.entries as Entry[]) : [],
        settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) } as Settings,
      }
    } catch {
      /* fallthrough */
    }
  }
  const local = readLocal()
  return {
    entries: local.entries,
    settings: { ...DEFAULT_SETTINGS, ...local.settings } as Settings,
  }
}

export async function saveStore(entries: Entry[], settings: Settings): Promise<void> {
  const payload: StoreShape = { entries, settings }
  writeLocal(payload)
  if (hasNative()) {
    try {
      await window.suixinji!.save(payload)
    } catch {
      /* local already written */
    }
  }
}

export async function applyWindowChrome(settings: Settings) {
  if (!hasNative()) return
  try {
    await window.suixinji!.setAlwaysOnTop(settings.alwaysOnTop)
    await window.suixinji!.setOpacity(settings.opacity)
  } catch {
    /* ignore */
  }
}

export async function nativeClose() {
  if (hasNative()) {
    await window.suixinji!.close()
  }
}

export async function nativeMinimize() {
  if (hasNative()) {
    await window.suixinji!.minimize()
  }
}
