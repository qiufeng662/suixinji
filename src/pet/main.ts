import './pet.css'

type PetShape = 'cutout' | 'circle'

type PetSettings = {
  petEnabled: boolean
  petImage: string | null
  petSize: number
  petAnimation: boolean
  petShowBadge: boolean
  petShape: PetShape
}

const root = document.getElementById('pet-root')!

const CLICK_LINES = [
  '今天也记一笔？',
  '完成一件也很棒。',
  '要不要写句随想？',
  '我在，慢慢来。',
  '桌角小助手报到。',
]

const IDLE_LINES = [
  '记得喝水。',
  '休息一下眼睛？',
  '今天想记点什么？',
  '我就在这儿。',
]

function api() {
  return window.suixinji
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '这么晚还不睡？'
  if (h < 11) return '早上好，新的一天。'
  if (h < 14) return '中午好，吃了吗？'
  if (h < 18) return '下午好，加油。'
  return '晚上好，辛苦了。'
}

function buildDom() {
  root.innerHTML = `
    <div class="pet-stage" id="pet-stage">
      <div class="pet-anchor">
        <div class="pet-body shape-default" id="pet-body" title="拖动移动 · 点击互动 · 右键菜单">
          <div class="pet-bubble" id="pet-bubble"></div>
          <div class="pet-hearts" id="pet-hearts"></div>
          <div class="pet-face" id="pet-face"></div>
          <div class="pet-badge" id="pet-badge" hidden>0</div>
        </div>
        <div class="pet-shadow" id="pet-shadow"></div>
      </div>
      <div class="pet-menu" id="pet-menu" role="menu"></div>
    </div>
  `
}

function setShape(shape: PetShape | 'default') {
  const body = document.getElementById('pet-body')!
  body.classList.remove('shape-cutout', 'shape-circle', 'shape-default')
  body.classList.add(`shape-${shape}`)
}

function renderDefault() {
  setShape('default')
  const face = document.getElementById('pet-face')!
  face.innerHTML = `
    <div class="pet-default" aria-hidden="true">
      <div class="shine"></div>
      <div class="eye left"></div>
      <div class="eye right"></div>
      <div class="blush left"></div>
      <div class="blush right"></div>
      <div class="smile"></div>
    </div>
  `
}

async function stripWhiteBackground(srcUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const max = 640
        const scale = Math.min(1, max / Math.max(img.width, img.height, 1))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(srcUrl)
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        const d = imageData.data
        const hard = 242
        const soft = 220
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i]!
          const g = d[i + 1]!
          const b = d[i + 2]!
          const minC = Math.min(r, g, b)
          const maxC = Math.max(r, g, b)
          if (minC >= soft && maxC - minC < 18) {
            if (minC >= hard) d[i + 3] = 0
            else {
              const t = (minC - soft) / (hard - soft)
              d[i + 3] = Math.min(d[i + 3]!, Math.round(255 * (1 - t)))
            }
          }
        }
        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(srcUrl)
      }
    }
    img.onerror = () => resolve(srcUrl)
    img.src = srcUrl
  })
}

async function renderFace(image: string | null, shape: PetShape) {
  const face = document.getElementById('pet-face')!
  if (!image) {
    renderDefault()
    return
  }
  const a = api()
  let url = image
  if (a?.petToUrl && !image.startsWith('data:')) {
    try {
      url = await a.petToUrl(image)
    } catch {
      url = image
    }
  }
  if (!url) {
    setShape('default')
    face.innerHTML = `<div class="pet-fail">图片读取失败<br/>请重新选择照片</div>`
    return
  }
  if (shape === 'cutout') url = await stripWhiteBackground(url)
  setShape(shape)
  face.innerHTML = `<img src="${url}" alt="挂件" draggable="false" id="pet-img" />`
  const img = document.getElementById('pet-img') as HTMLImageElement | null
  img?.addEventListener('error', () => {
    setShape('default')
    face.innerHTML = `<div class="pet-fail">图片加载失败</div>`
  })
}

function applyIdle(on: boolean) {
  document.getElementById('pet-body')!.classList.toggle('anim-idle', on)
}

let bubbleTimer = 0
function showBubble(text: string, ms = 2400) {
  const bubble = document.getElementById('pet-bubble')!
  bubble.textContent = text
  bubble.classList.add('show')
  window.clearTimeout(bubbleTimer)
  bubbleTimer = window.setTimeout(() => bubble.classList.remove('show'), ms)
}

function burstHearts() {
  const box = document.getElementById('pet-hearts')
  if (!box) return
  const glyphs = ['♥', '♥', '✦', '♥']
  glyphs.forEach((g, i) => {
    const s = document.createElement('span')
    s.textContent = g
    s.style.setProperty('--dx', `${(Math.random() * 36 - 18).toFixed(0)}px`)
    s.style.left = `${42 + Math.random() * 20}%`
    s.style.animationDelay = `${i * 60}ms`
    s.style.color = i % 2 === 0 ? '#c4785a' : '#3d5a4c'
    box.appendChild(s)
    window.setTimeout(() => s.remove(), 1000)
  })
}

async function refreshBadge() {
  const a = api()
  if (!a) return
  try {
    const store = await a.load()
    const badge = document.getElementById('pet-badge')
    if (!badge) return
    const settings = (store.settings ?? {}) as Partial<PetSettings>
    if (settings.petShowBadge === false) {
      badge.hidden = true
      return
    }
    const today = new Date()
    const done = (
      store.entries as Array<{
        kind?: string
        done?: boolean
        doneAt?: string
        createdAt?: string
      }>
    ).filter((e) => {
      const iso = e.doneAt || e.createdAt || ''
      if (!iso) return false
      const d = new Date(iso)
      const same =
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      return same && (e.kind !== 'done' || e.done)
    }).length
    badge.hidden = done <= 0
    badge.textContent = String(done)
  } catch {
    /* ignore */
  }
}

async function pickPhoto() {
  const a = api()
  if (!a?.pickPetImage) return
  const path = await a.pickPetImage()
  if (!path) return
  const isCutout = /\.(png|webp)$/i.test(path)
  const shape: PetShape = isCutout ? 'cutout' : 'circle'
  await renderFace(path, shape)
  showBubble(isCutout ? '挂好了，拖我试试' : '换上啦')
  try {
    const store = await a.load()
    await a.save({
      entries: store.entries,
      settings: {
        ...(store.settings as object),
        petImage: path,
        petEnabled: true,
        petShape: shape,
      },
    })
  } catch {
    /* ignore */
  }
}

async function toggleShape() {
  const a = api()
  const body = document.getElementById('pet-body')!
  const next: PetShape = body.classList.contains('shape-circle') ? 'cutout' : 'circle'
  const store = a ? await a.load() : null
  const img = (store?.settings as { petImage?: string | null } | undefined)?.petImage || null
  if (img) {
    await renderFace(img, next)
    showBubble(next === 'cutout' ? '抠图原形' : '圆形头像')
  } else {
    showBubble('先选一张照片')
  }
  if (a && store) {
    await a.save({
      entries: store.entries,
      settings: { ...(store.settings as object), petShape: next },
    })
  }
}

function hideMenu() {
  document.getElementById('pet-menu')?.classList.remove('open')
}

function showMenu(x: number, y: number) {
  const menu = document.getElementById('pet-menu')!
  menu.innerHTML = `
    <button type="button" data-act="photo">更换照片</button>
    <button type="button" data-act="shape">切换抠图 / 圆形</button>
    <button type="button" data-act="open">打开随心记</button>
    <hr />
    <button type="button" data-act="hide" class="danger">隐藏挂件</button>
  `
  menu.classList.add('open')
  const mw = 160
  const mh = 170
  const left = Math.min(x, window.innerWidth - mw - 4)
  const top = Math.min(y, window.innerHeight - mh - 4)
  menu.style.left = `${Math.max(4, left)}px`
  menu.style.top = `${Math.max(4, top)}px`

  menu.onclick = (e) => {
    const btn = (e.target as HTMLElement).closest('button')
    if (!btn) return
    const act = btn.getAttribute('data-act')
    hideMenu()
    if (act === 'photo') void pickPhoto()
    if (act === 'shape') void toggleShape()
    if (act === 'open') void api()?.focusMainCard?.()
    if (act === 'hide') void api()?.setPetVisible(false)
  }
}

function wire() {
  const body = document.getElementById('pet-body')!
  const stage = document.getElementById('pet-stage')!
  const a = api()

  let dragging = false
  let moved = false
  let startX = 0
  let startY = 0
  let lastX = 0
  let clickAt = 0

  const onDown = (e: PointerEvent) => {
    if (e.button === 2) return
    hideMenu()
    dragging = true
    moved = false
    startX = e.screenX
    startY = e.screenY
    lastX = e.screenX
    body.classList.add('is-dragging')
    body.setPointerCapture(e.pointerId)
    a?.petDragStart?.()
  }

  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.screenX - startX
    const dy = e.screenY - startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true
    if (moved) {
      a?.petDragMove?.(e.screenX, e.screenY)
      // 轻微随速度倾斜
      const vx = e.screenX - lastX
      lastX = e.screenX
      const tilt = Math.max(-8, Math.min(8, vx * 0.35))
      body.style.transform = `scale(1.04) translateY(-4px) rotate(${tilt}deg)`
    }
  }

  const onUp = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    body.classList.remove('is-dragging')
    body.style.transform = ''
    try {
      body.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    a?.petDragEnd?.()

    const now = Date.now()
    if (!moved) {
      if (now - clickAt < 320) {
        // 双击打开主卡片
        clickAt = 0
        void a?.focusMainCard?.()
        showBubble('打开卡片')
        return
      }
      clickAt = now
      body.classList.remove('is-pop')
      void body.offsetWidth
      body.classList.add('is-pop')
      burstHearts()
      showBubble(CLICK_LINES[Math.floor(Math.random() * CLICK_LINES.length)]!)
      void refreshBadge()
    }
  }

  body.addEventListener('pointerdown', onDown)
  body.addEventListener('pointermove', onMove)
  body.addEventListener('pointerup', onUp)
  body.addEventListener('pointercancel', onUp)

  body.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    showMenu(e.clientX, e.clientY)
  })

  stage.addEventListener('pointerdown', (e) => {
    if (!(e.target as HTMLElement).closest('.pet-menu')) hideMenu()
  })

  // 偶发闲聊
  window.setInterval(() => {
    if (document.hidden || dragging) return
    if (Math.random() > 0.35) return
    showBubble(IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)]!, 2000)
  }, 48000)
}

async function init() {
  buildDom()
  wire()
  renderDefault()
  const a = api()
  if (!a) return
  try {
    const store = await a.load()
    const s = (store.settings ?? {}) as PetSettings
    const shape: PetShape = s.petShape || (s.petImage ? 'cutout' : 'circle')
    if (s.petImage) await renderFace(s.petImage, shape)
    else renderDefault()
    applyIdle(Boolean(s.petAnimation))
    await refreshBadge()
    window.setTimeout(() => showBubble(greeting(), 2800), 400)
  } catch {
    /* keep default */
  }

  a.onPetSettings?.((s) => {
    const shape: PetShape = s.petShape || (s.petImage ? 'cutout' : 'circle')
    void renderFace(s.petImage || null, shape)
    applyIdle(Boolean(s.petAnimation))
    void refreshBadge()
  })
}

void init()
