import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_SETTINGS,
  KIND_META,
  formatDay,
  isToday,
  resolveTheme,
  uid,
  type Entry,
  type EntryKind,
  type Settings,
} from './lib/types'
import { applyWindowChrome, loadStore, nativeClose, nativeMinimize, saveStore } from './lib/store'
import { SettingsDrawer } from './components/SettingsDrawer'

const ACCENTS = ['#3D5A4C', '#2F6F7E', '#B85C7A', '#C4785A', '#5B4B8A', '#1C1917']

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  const [draft, setDraft] = useState('')
  const [tagsDraft, setTagsDraft] = useState('')
  const [kind, setKind] = useState<EntryKind>('done')
  const [showSettings, setShowSettings] = useState(false)
  const [nudge, setNudge] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [pointer, setPointer] = useState({ x: 50, y: 20 })
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      const data = await loadStore()
      if (!alive) return
      setEntries(data.entries)
      setSettings(data.settings)
      setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    void saveStore(entries, settings)
  }, [entries, settings, ready])

  useEffect(() => {
    if (!ready) return
    void applyWindowChrome(settings)
  }, [settings, ready])

  const theme = useMemo(() => resolveTheme(settings), [settings])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--paper', theme.paper)
    root.style.setProperty('--paper-deep', theme.paperDeep)
    root.style.setProperty('--ink', theme.ink)
    root.style.setProperty('--mist', theme.mist)
    root.style.setProperty('--accent', theme.accent)
    root.style.setProperty('--clay', theme.clay)
    root.style.setProperty('--shadow', theme.shadow)
    root.style.setProperty('--glow', theme.glow)
  }, [theme])

  const todayEntries = useMemo(
    () => entries.filter((e) => isToday(e.createdAt) || (e.doneAt && isToday(e.doneAt))),
    [entries],
  )

  const doneCount = todayEntries.filter((e) => e.done || e.kind !== 'done').length
  const doneTasks = todayEntries.filter((e) => e.kind === 'done' && e.done).length
  const totalTasks = todayEntries.filter((e) => e.kind === 'done').length

  const addEntry = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    const tags = tagsDraft
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 6)
    const now = new Date().toISOString()
    const entry: Entry = {
      id: uid(),
      kind,
      text,
      tags,
      done: kind === 'done' ? false : true,
      createdAt: now,
      doneAt: kind === 'done' ? undefined : now,
    }
    setEntries((prev) => [entry, ...prev])
    setDraft('')
    setTagsDraft('')
    setNudge(true)
    window.setTimeout(() => setNudge(false), 380)
  }, [draft, tagsDraft, kind])

  const toggleDone = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              done: !e.done,
              doneAt: !e.done ? new Date().toISOString() : undefined,
            }
          : e,
      ),
    )
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const clearToday = useCallback(() => {
    setEntries((prev) => prev.filter((e) => !(isToday(e.createdAt) || (e.doneAt && isToday(e.doneAt)))))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const pickPetImage = useCallback(async () => {
    if (!window.suixinji?.pickPetImage) return
    const rel = await window.suixinji.pickPetImage()
    if (!rel) return
    setSettings((prev) => ({ ...prev, petImage: rel, petEnabled: true }))
  }, [])

  const onPointerMove = (e: React.PointerEvent) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const max = 8
    setTilt({
      x: (0.5 - py) * max * 2,
      y: (px - 0.5) * max * 2,
    })
    setPointer({ x: px * 100, y: py * 100 })
  }

  const onPointerLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  if (!ready) {
    return (
      <div className="app-shell">
        <div className="stage">
          <div className="card" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--mist)', fontSize: 13 }}>正在铺开纸卡…</span>
          </div>
        </div>
      </div>
    )
  }

  const customLabel = settings.customKindLabel?.trim() || '自定义'

  return (
    <div
      className={[
        'app-shell',
        `size-${settings.size}`,
        settings.compact ? 'compact' : '',
        settings.fontFamily === 'serif' ? 'font-serif' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="stage">
        <div
          ref={cardRef}
          className={`card${nudge ? ' is-nudge' : ''}`}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            ['--gx' as string]: `${pointer.x}%`,
            ['--gy' as string]: `${pointer.y}%`,
            borderRadius: settings.compact ? 14 : 18,
            opacity: 1,
          }}
        >
          <header className="card-header">
            <div className="brand">
              <div className="brand-title">随心记</div>
              <div className="brand-date">{formatDay()}</div>
            </div>
            <div className="win-actions">
              <button
                className="icon-btn"
                title="最小化"
                aria-label="最小化"
                onClick={() => void nativeMinimize()}
              >
                —
              </button>
              <button
                className="icon-btn"
                title="设置"
                aria-label="设置"
                onClick={() => setShowSettings(true)}
              >
                ⚙
              </button>
              <button
                className="icon-btn"
                title="隐藏到托盘"
                aria-label="隐藏"
                onClick={() => void nativeClose()}
              >
                ×
              </button>
            </div>
          </header>

          <section className="composer">
            <div className="kind-row">
              {(Object.keys(KIND_META) as EntryKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`chip${kind === k ? ' active' : ''}`}
                  onClick={() => setKind(k)}
                >
                  {KIND_META[k].icon} {k === 'custom' ? customLabel : KIND_META[k].label}
                </button>
              ))}
            </div>

            <div className="input-wrap">
              <textarea
                value={draft}
                placeholder={
                  kind === 'done'
                    ? '今天完成了什么？记一笔…'
                    : kind === 'note'
                      ? '闪过什么念头？'
                      : kind === 'gratitude'
                        ? '今天想感谢什么？'
                        : '随便写点什么…'
                }
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    addEntry()
                  }
                }}
              />
              <div className="meta-row">
                <input
                  className="tag-input"
                  value={tagsDraft}
                  placeholder="标签，空格或逗号分隔"
                  onChange={(e) => setTagsDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addEntry()
                    }
                  }}
                />
                <button
                  type="button"
                  className="add-btn"
                  disabled={!draft.trim()}
                  onClick={addEntry}
                >
                  记下
                </button>
              </div>
            </div>
          </section>

          <section className="list-area">
            {todayEntries.length === 0 ? (
              <div className="empty">
                <div className="empty-title">今天还是空白页</div>
                <div className="empty-sub">
                  完成一件事、冒一个念头，或记一笔小确幸——写下来就好。
                </div>
              </div>
            ) : (
              <>
                <div className="day-label">今日 · {todayEntries.length} 条</div>
                {todayEntries.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    customLabel={customLabel}
                    onToggle={() => toggleDone(e.id)}
                    onRemove={() => removeEntry(e.id)}
                  />
                ))}
              </>
            )}
          </section>

          {settings.showStats && (
            <footer className="footer">
              <div className="stats">
                <span>
                  完成 <b>{doneTasks}</b>/{totalTasks || 0}
                </span>
                <span>
                  记录 <b>{doneCount}</b>
                </span>
              </div>
              <div className="footer-actions">
                <button
                  className="icon-btn"
                  title="清空今日"
                  aria-label="清空今日"
                  onClick={clearToday}
                >
                  ⌫
                </button>
              </div>
            </footer>
          )}

          {showSettings && (
            <>
              <div className="drawer-backdrop" onClick={() => setShowSettings(false)} />
              <SettingsDrawer
                settings={settings}
                accents={ACCENTS}
                onChange={updateSettings}
                onClose={() => setShowSettings(false)}
                onClearAll={() => {
                  setEntries([])
                  setShowSettings(false)
                }}
                onPickPetImage={() => void pickPetImage()}
              />
            </>
          )}
        </div>
      </div>

      {!window.suixinji && <div className="browser-bar">浏览器预览 · 数据存本机</div>}
    </div>
  )
}

function EntryRow({
  entry,
  customLabel,
  onToggle,
  onRemove,
}: {
  entry: Entry
  customLabel: string
  onToggle: () => void
  onRemove: () => void
}) {
  const meta = KIND_META[entry.kind]
  const label = entry.kind === 'custom' ? customLabel : meta.label
  return (
    <article className={`entry${entry.done ? ' done' : ''}`}>
      {entry.kind === 'done' ? (
        <button
          type="button"
          className="entry-check"
          aria-label={entry.done ? '标记未完成' : '标记完成'}
          onClick={onToggle}
        >
          ✓
        </button>
      ) : (
        <div className="entry-icon" title={label}>
          {meta.icon}
        </div>
      )}
      <div className="entry-body">
        <div className="entry-text">{entry.text}</div>
        <div className="entry-meta">
          {entry.tags.map((t) => (
            <span className="tag" key={t}>
              #{t}
            </span>
          ))}
          <span className="time">
            {entry.kind !== 'done' ? `${label} · ` : ''}
            {formatTimeSafe(entry.doneAt ?? entry.createdAt)}
          </span>
        </div>
      </div>
      <button type="button" className="entry-del" aria-label="删除" onClick={onRemove}>
        ×
      </button>
    </article>
  )
}

function formatTimeSafe(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
