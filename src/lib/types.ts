export type EntryKind = 'done' | 'note' | 'gratitude' | 'custom'

export type Entry = {
  id: string
  kind: EntryKind
  text: string
  tags: string[]
  mood?: string
  done: boolean
  createdAt: string
  doneAt?: string
}

export type ThemeId = 'paper' | 'night' | 'sakura' | 'ocean' | 'custom'

export type Settings = {
  themeId: ThemeId
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

export const DEFAULT_SETTINGS: Settings = {
  themeId: 'paper',
  accent: '#3D5A4C',
  size: 'M',
  alwaysOnTop: true,
  opacity: 1,
  compact: false,
  customKindLabel: '自定义',
  fontFamily: 'sans',
  showStats: true,
  blur: 0,
}

export type Theme = {
  id: ThemeId
  name: string
  paper: string
  paperDeep: string
  ink: string
  mist: string
  accent: string
  clay: string
  shadow: string
  glow: string
}

export const THEMES: Theme[] = [
  {
    id: 'paper',
    name: '宣纸暖阳',
    paper: '#F6F1E7',
    paperDeep: '#EDE6D8',
    ink: '#1C1917',
    mist: '#A8A29E',
    accent: '#3D5A4C',
    clay: '#C4785A',
    shadow: 'rgba(28, 25, 23, 0.22)',
    glow: 'rgba(61, 90, 76, 0.18)',
  },
  {
    id: 'night',
    name: '夜航',
    paper: '#1A1816',
    paperDeep: '#24211E',
    ink: '#E8E4DC',
    mist: '#8A847C',
    accent: '#7BAF96',
    clay: '#D4896A',
    shadow: 'rgba(0, 0, 0, 0.45)',
    glow: 'rgba(123, 175, 150, 0.2)',
  },
  {
    id: 'sakura',
    name: '樱时',
    paper: '#FBF3F1',
    paperDeep: '#F3E4E1',
    ink: '#2B1E22',
    mist: '#B09A9C',
    accent: '#B85C7A',
    clay: '#D4A5A5',
    shadow: 'rgba(43, 30, 34, 0.18)',
    glow: 'rgba(184, 92, 122, 0.18)',
  },
  {
    id: 'ocean',
    name: '海雾',
    paper: '#F0F5F6',
    paperDeep: '#E2EBEE',
    ink: '#152428',
    mist: '#8FA3AA',
    accent: '#2F6F7E',
    clay: '#C47A5A',
    shadow: 'rgba(21, 36, 40, 0.2)',
    glow: 'rgba(47, 111, 126, 0.18)',
  },
]

export function resolveTheme(settings: Settings): Theme {
  const base = THEMES.find((t) => t.id === settings.themeId) ?? THEMES[0]
  if (settings.themeId === 'custom') {
    return {
      ...base,
      id: 'custom',
      name: '自定义',
      accent: settings.accent || base.accent,
    }
  }
  return {
    ...base,
    accent: settings.accent && settings.accent !== DEFAULT_SETTINGS.accent ? settings.accent : base.accent,
  }
}

export const KIND_META: Record<EntryKind, { label: string; icon: string; hint: string }> = {
  done: { label: '完成', icon: '✓', hint: '今天完成的事' },
  note: { label: '随想', icon: '✎', hint: '一闪而过的念头' },
  gratitude: { label: '感恩', icon: '✿', hint: '值得记一笔的小确幸' },
  custom: { label: '自定义', icon: '◆', hint: '你说了算' },
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatDay(d = new Date()): string {
  return d.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function isToday(iso: string): boolean {
  const d = new Date(iso)
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}
