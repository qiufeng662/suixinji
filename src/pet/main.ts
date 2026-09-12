import './pet.css'

type PetShape = 'cutout' | 'circle'

type PetSettings = {
  petEnabled: boolean
  petImage: string | null
  petSize: number
  petAnimation: boolean
  petShowBadge: boolean
  petShape: PetShape
  petAlwaysOnTop?: boolean
  petLockPosition?: boolean
  petClickThrough?: boolean
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
  '窗外怎么样？',
]

const PET_LINES = ['嗯…好舒服。', '再摸一下？', '嘿嘿。', '别停～']

function api() {
  return window.suixinji
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '这么晚，注意休息。'
  if (h < 11) return '早上好，新的一天。'
  if (h < 14) return '中午好，吃了吗？'
  if (h < 18) return '下午好，稳住节奏。'
  if (h < 22) return '晚上好，辛苦了。'
  return '夜深了，早点睡。'
}

function buildDom() {
  root.innerHTML = `
    <div class="pet-stage" id="pet-stage">
      <div class="pet-anchor">
        <div class="pet-body shape-default" id="pet-body" title="">
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
      <div class="eye left" id="eye-l"></div>
      <div class="eye right" id="eye-r"></div>
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
  face.innerHTML = `<img src="${url}" alt="" draggable="false" id="pet-img" />`
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

function burstHearts(count = 4) {
  const box = document.getElementById('pet-hearts')
  if (!box) return
  const glyphs = ['♥', '♥', '✦', '♥', '♪']
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span')
    s.textContent = glyphs[i % glyphs.length]!
    s.style.setProperty('--dx', `${(Math.random() * 40 - 20).toFixed(0)}px`)
    s.style.setProperty('--rot', `${(Math.random() * 24 - 12).toFixed(0)}deg`)
    s.style.left = `${40 + Math.random() * 24}%`
    s.style.animationDelay = `${i * 55}ms`
    s.style.color = i % 2 === 0 ? '#c4785a' : '#3d5a4c'
    s.style.fontSize = `${13 + Math.random() * 5}px`
    box.appendChild(s)
    window.setTimeout(() => s.remove(), 1100)
  }
}

function popBody() {
  const body = document.getElementById('pet-body')!
  body.classList.remove('is-pop')
  void body.offsetWidth
  body.classList.add('is-pop')
}

async function refreshBadge(bump = false) {
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
    if (bump && done > 0) {
      badge.classList.remove('bump')
      void badge.offsetWidth
      badge.classList.add('bump')
      window.setTimeout(() => badge.classList.remove('bump'), 280)
    }
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
  popBody()
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
    popBody()
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

let lastSettings: PetSettings | null = null

async function savePetPatch(patch: Partial<PetSettings>) {
  const a = api()
  if (!a) return
  const store = await a.load()
  lastSettings = { ...(store.settings as PetSettings), ...patch } as PetSettings
  await a.save({
    entries: store.entries,
    settings: { ...(store.settings as object), ...patch },
  })
}

function showMenu(x: number, y: number) {
  const menu = document.getElementById('pet-menu')!
  const topOn = lastSettings?.petAlwaysOnTop !== false
  const locked = Boolean(lastSettings?.petLockPosition)
  menu.innerHTML = `
    <button type="button" data-act="photo">更换照片</button>
    <button type="button" data-act="shape">切换抠图 / 圆形</button>
    <button type="button" data-act="open">打开随心记</button>
    <button type="button" data-act="top">${topOn ? '取消置顶' : '恢复置顶'}</button>
    <button type="button" data-act="lock">${locked ? '解锁位置' : '锁定位置'}</button>
    <hr />
    <button type="button" data-act="hide" class="danger">隐藏挂件</button>
  `
  menu.classList.add('open')
  const mw = 176
  const mh = 250
  menu.style.left = `${Math.max(4, Math.min(x, window.innerWidth - mw - 4))}px`
  menu.style.top = `${Math.max(4, Math.min(y, window.innerHeight - mh - 4))}px`

  menu.onclick = (e) => {
    const btn = (e.target as HTMLElement).closest('button')
    if (!btn) return
    const act = btn.getAttribute('data-act')
    hideMenu()
    if (act === 'photo') void pickPhoto()
    if (act === 'shape') void toggleShape()
    if (act === 'open') void api()?.focusMainCard?.()
    if (act === 'top') {
      const next = !topOn
      void savePetPatch({ petAlwaysOnTop: next })
      showBubble(next ? '已置顶' : '已取消置顶')
    }
    if (act === 'lock') {
      const next = !locked
      void savePetPatch({ petLockPosition: next })
      showBubble(next ? '位置已锁定' : '可以拖动了')
    }
    if (act === 'hide') void api()?.setPetVisible(false)
  }
}

function wireEyeFollow() {
  const stage = document.getElementById('pet-stage')!
  stage.addEventListener('pointermove', (e) => {
    const eyeL = document.getElementById('eye-l')
    const eyeR = document.getElementById('eye-r')
    if (!eyeL || !eyeR) return
    const body = document.getElementById('pet-body')!
    const rect = body.getBoundingClientRect()
    if (rect.width < 4) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height * 0.42
    const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width * 1.2)))
    const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height * 1.2)))
    const ex = `${(dx * 2.2).toFixed(2)}px`
    const ey = `${(dy * 1.6).toFixed(2)}px`
    eyeL.style.setProperty('--ex', ex)
    eyeL.style.setProperty('--ey', ey)
    eyeR.style.setProperty('--ex', ex)
    eyeR.style.setProperty('--ey', ey)
  })
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
  let petTimer = 0
  let petting = false

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

    // 长按抚摸
    window.clearTimeout(petTimer)
    petTimer = window.setTimeout(() => {
      if (!dragging || moved) return
      petting = true
      body.classList.add('is-petting')
      burstHearts(3)
      showBubble(PET_LINES[Math.floor(Math.random() * PET_LINES.length)]!, 1400)
    }, 380)
  }

  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.screenX - startX
    const dy = e.screenY - startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      moved = true
      window.clearTimeout(petTimer)
      if (petting) {
        petting = false
        body.classList.remove('is-petting')
      }
    }
    if (moved) {
      a?.petDragMove?.(e.screenX, e.screenY)
      const vx = e.screenX - lastX
      lastX = e.screenX
      const tilt = Math.max(-10, Math.min(10, vx * 0.4))
      body.style.transform = `scale(1.05) translateY(-6px) rotate(${tilt}deg)`
    }
  }

  const onUp = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    window.clearTimeout(petTimer)
    const wasPetting = petting
    petting = false
    body.classList.remove('is-dragging', 'is-petting')
    body.style.transform = ''
    try {
      body.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    a?.petDragEnd?.()

    if (wasPetting) {
      popBody()
      return
    }

    const now = Date.now()
    if (!moved) {
      if (now - clickAt < 320) {
        clickAt = 0
        void a?.focusMainCard?.()
        showBubble('打开卡片')
        return
      }
      clickAt = now
      popBody()
      burstHearts(5)
      showBubble(CLICK_LINES[Math.floor(Math.random() * CLICK_LINES.length)]!)
      void refreshBadge()
    } else {
      // 松手回弹
      popBody()
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

  wireEyeFollow()

  window.setInterval(() => {
    if (document.hidden || dragging) return
    if (Math.random() > 0.32) return
    showBubble(IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)]!, 2000)
  }, 42000)
}

async function init() {
  document.title = ' '
  buildDom()
  wire()
  renderDefault()
  const a = api()
  if (!a) return
  try {
    const store = await a.load()
    const s = (store.settings ?? {}) as PetSettings
    lastSettings = s
    const shape: PetShape = s.petShape || (s.petImage ? 'cutout' : 'circle')
    if (s.petImage) await renderFace(s.petImage, shape)
    else renderDefault()
    applyIdle(Boolean(s.petAnimation))
    await refreshBadge()
    window.setTimeout(() => showBubble(greeting(), 3000), 450)
  } catch {
    /* keep default */
  }

  a.onPetSettings?.((s) => {
    lastSettings = { ...lastSettings, ...s } as PetSettings
    const shape: PetShape = s.petShape || (s.petImage ? 'cutout' : 'circle')
    void renderFace(s.petImage || null, shape)
    applyIdle(Boolean(s.petAnimation))
    void refreshBadge()
  })

  a.onPetCelebrate?.(() => {
    popBody()
    burstHearts(6)
    showBubble('记下啦！', 1600)
    void refreshBadge(true)
  })
}

void init()
