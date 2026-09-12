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
const PHRASES = [
  '今天也记一笔？',
  '完成一件也很棒。',
  '要不要写句随想？',
  '我在，慢慢来。',
  '桌角小助手报到。',
]

function api() {
  return window.suixinji
}

function buildDom() {
  root.innerHTML = `
    <div class="pet-stage">
      <div class="pet-actions">
        <button type="button" title="更换照片" aria-label="更换照片" id="pet-photo">📷</button>
        <button type="button" title="切换抠图/圆形" aria-label="切换显示形状" id="pet-shape">✂</button>
        <button type="button" title="隐藏挂件" aria-label="隐藏挂件" id="pet-hide">×</button>
      </div>
      <div class="pet-body shape-default" id="pet-body" title="拖动移动 · 单击互动">
        <div class="pet-bubble" id="pet-bubble"></div>
        <div class="pet-face" id="pet-face"></div>
        <div class="pet-badge" id="pet-badge" hidden>0</div>
      </div>
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
      <div class="eye left"></div>
      <div class="eye right"></div>
      <div class="blush left"></div>
      <div class="blush right"></div>
      <div class="smile"></div>
    </div>
  `
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
  setShape(shape)
  face.innerHTML = `<img src="${url}" alt="挂件" draggable="false" id="pet-img" />`
  const img = document.getElementById('pet-img') as HTMLImageElement | null
  if (img) {
    img.addEventListener('error', () => {
      setShape('default')
      face.innerHTML = `<div class="pet-fail">图片加载失败</div>`
    })
  }
}

function applyAnim(on: boolean) {
  const body = document.getElementById('pet-body')!
  body.classList.toggle('anim-float', on)
}

function showBubble(text: string) {
  const bubble = document.getElementById('pet-bubble')!
  bubble.textContent = text
  bubble.classList.add('show')
  window.setTimeout(() => bubble.classList.remove('show'), 2200)
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
    badge.hidden = false
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
  // 抠图 PNG 默认用原形；JPG 仍可能无透明，用户可再切
  const isLikelyCutout = /\.(png|webp)$/i.test(path)
  const shape: PetShape = isLikelyCutout ? 'cutout' : 'circle'
  await renderFace(path, shape)
  showBubble(isLikelyCutout ? '抠图挂好了！' : '换上啦！')
  // persist shape guess via settings save from main card is separate; store locally in settings through load/save
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
      settings: {
        ...(store.settings as object),
        petShape: next,
      },
    })
  }
}

function wire() {
  const body = document.getElementById('pet-body')!
  const photoBtn = document.getElementById('pet-photo')!
  const shapeBtn = document.getElementById('pet-shape')!
  const hideBtn = document.getElementById('pet-hide')!
  const a = api()

  photoBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    void pickPhoto()
  })
  shapeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    void toggleShape()
  })
  hideBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    void a?.setPetVisible(false)
  })

  // 自定义拖动（不用 app-region，保证点击可用）
  let dragging = false
  let moved = false
  let startX = 0
  let startY = 0

  const onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.pet-actions')) return
    dragging = true
    moved = false
    startX = e.screenX
    startY = e.screenY
    body.classList.add('is-dragging')
    body.setPointerCapture(e.pointerId)
    a?.petDragStart?.()
  }
  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.screenX - startX
    const dy = e.screenY - startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true
    if (moved) a?.petDragMove?.(e.screenX, e.screenY)
  }
  const onUp = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    body.classList.remove('is-dragging')
    try {
      body.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    a?.petDragEnd?.()
    if (!moved) {
      // 单击互动
      body.classList.remove('is-pop')
      void body.offsetWidth
      body.classList.add('is-pop')
      showBubble(PHRASES[Math.floor(Math.random() * PHRASES.length)]!)
      void refreshBadge()
    }
  }

  body.addEventListener('pointerdown', onDown)
  body.addEventListener('pointermove', onMove)
  body.addEventListener('pointerup', onUp)
  body.addEventListener('pointercancel', onUp)
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
    // 默认不飘，避免「自己动」
    applyAnim(Boolean(s.petAnimation))
    await refreshBadge()
    showBubble(s.petImage ? '拖我挪位置 · 点我一下' : '我在这儿～')
  } catch {
    /* keep default */
  }

  a.onPetSettings?.((s) => {
    const shape: PetShape = s.petShape || (s.petImage ? 'cutout' : 'circle')
    void renderFace(s.petImage || null, shape)
    applyAnim(Boolean(s.petAnimation))
    void refreshBadge()
  })
}

void init()
