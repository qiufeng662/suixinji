import { THEMES, type Settings, type ThemeId } from '../lib/types'

type Props = {
  settings: Settings
  accents: string[]
  onChange: (patch: Partial<Settings>) => void
  onClose: () => void
  onClearAll: () => void
}

export function SettingsDrawer({ settings, accents, onChange, onClose, onClearAll }: Props) {
  return (
    <aside className="drawer" role="dialog" aria-label="设置">
      <div className="drawer-head">
        <div className="drawer-title">DIY 纸卡</div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭设置">
          ×
        </button>
      </div>

      <div className="drawer-body">
        <div className="field">
          <div className="field-label">主题</div>
          <div className="theme-grid">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-swatch${settings.themeId === t.id ? ' active' : ''}`}
                onClick={() =>
                  onChange({
                    themeId: t.id as ThemeId,
                    accent: t.accent,
                  })
                }
              >
                <div className="swatch-bar">
                  <span style={{ background: t.paper }} />
                  <span style={{ background: t.accent }} />
                  <span style={{ background: t.clay }} />
                </div>
                <div className="theme-name">{t.name}</div>
              </button>
            ))}
            <button
              type="button"
              className={`theme-swatch${settings.themeId === 'custom' ? ' active' : ''}`}
              onClick={() => onChange({ themeId: 'custom' })}
            >
              <div className="swatch-bar">
                <span style={{ background: '#F6F1E7' }} />
                <span style={{ background: settings.accent }} />
                <span style={{ background: '#1C1917' }} />
              </div>
              <div className="theme-name">自定义</div>
            </button>
          </div>
        </div>

        <div className="field">
          <div className="field-label">主色</div>
          <div className="color-row">
            {accents.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-dot${settings.accent === c ? ' active' : ''}`}
                style={{ background: c }}
                aria-label={`主色 ${c}`}
                onClick={() => onChange({ accent: c, themeId: settings.themeId === 'paper' ? 'custom' : settings.themeId })}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">尺寸</div>
          <div className="seg">
            {(['S', 'M', 'L'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={settings.size === s ? 'active' : ''}
                onClick={() => onChange({ size: s })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <span className="row-label">始终置顶</span>
          <button
            type="button"
            className={`toggle${settings.alwaysOnTop ? ' on' : ''}`}
            aria-pressed={settings.alwaysOnTop}
            onClick={() => onChange({ alwaysOnTop: !settings.alwaysOnTop })}
          />
        </div>

        <div className="row">
          <span className="row-label">紧凑布局</span>
          <button
            type="button"
            className={`toggle${settings.compact ? ' on' : ''}`}
            aria-pressed={settings.compact}
            onClick={() => onChange({ compact: !settings.compact })}
          />
        </div>

        <div className="row">
          <span className="row-label">显示统计</span>
          <button
            type="button"
            className={`toggle${settings.showStats ? ' on' : ''}`}
            aria-pressed={settings.showStats}
            onClick={() => onChange({ showStats: !settings.showStats })}
          />
        </div>

        <div className="row">
          <span className="row-label">标题衬线体</span>
          <button
            type="button"
            className={`toggle${settings.fontFamily === 'serif' ? ' on' : ''}`}
            aria-pressed={settings.fontFamily === 'serif'}
            onClick={() =>
              onChange({ fontFamily: settings.fontFamily === 'serif' ? 'sans' : 'serif' })
            }
          />
        </div>

        <div className="field">
          <div className="field-label">窗口不透明度 · {Math.round(settings.opacity * 100)}%</div>
          <input
            type="range"
            min={0.45}
            max={1}
            step={0.01}
            value={settings.opacity}
            onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          />
        </div>

        <div className="field">
          <div className="field-label">自定义类型名称</div>
          <input
            className="text-input"
            value={settings.customKindLabel}
            maxLength={8}
            onChange={(e) => onChange({ customKindLabel: e.target.value })}
            placeholder="例如：灵感 / 碎片"
          />
        </div>

        <div className="hint">
          窗口可拖动顶栏挪位置，右下角可拉伸大小。关闭按钮会收进托盘，不会退出程序。
        </div>

        <button type="button" className="danger-btn" onClick={onClearAll}>
          清空全部记录
        </button>
      </div>
    </aside>
  )
}
