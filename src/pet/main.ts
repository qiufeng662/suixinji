import './pet.css'

type PetSettings = {
  petEnabled: boolean
  petImage: string | null
  petSize: number
  petAnimation: boolean
  petShowBadge: boolean
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
        <button type="button" title="隐藏挂件" aria-label="隐藏挂件" id="pet-hide">×</button>
      </div>
      <div class="pet-body" id="pet-body" title="拖动移动 · 单击互动">
        <div class="pet-bubble" id="pet-bubble"></div>
        <div class="pet-face" id="pet-face"></div>
        <div class="pet-badge" id="pet-badge" hidden>0</div>
      </div>
    </div>
  `
}

function renderDefault() {
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

async function renderFace(image: string | null) {
  const face = document.getElementById('pet-face')!
  if (!image) {
    renderDefault()
    return
  }
  const a = api()
  let url = image
  if (a?.petToUrl && !image.startsWith('data:') && !image.startsWith('petfile://')) {
    try {
      url = await a.petToUrl(image)
    } catch {
      url = image
    }
  }
  face.innerHTML = `<img src="${url}" alt="挂件照片" draggable="false" />`
}

function applyAnim(on: boolean) {
  const body = document.getElementById('pet-body')!
  body.style.animation = on ? '' : 'none'
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
  await renderFace(path)
  showBubble('换上啦！')
}

function wire() {
  const body = document.getElementById('pet-body')!
  const photoBtn = document.getElementById('pet-photo')!
  const hideBtn = document.getElementById('pet-hide')!

  photoBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    void pickPhoto()
  })
  hideBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    void api()?.setPetVisible(false)
  })

  body.addEventListener('click', () => {
    body.classList.remove('is-pop')
    void body.offsetWidth
    body.classList.add('is-pop')
    showBubble(PHRASES[Math.floor(Math.random() * PHRASES.length)]!)
    void refreshBadge()
  })
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
    await renderFace(s.petImage || null)
    applyAnim(s.petAnimation !== false)
    await refreshBadge()
    showBubble('我在这儿～')
  } catch {
    /* keep default */
  }

  a.onPetSettings?.((s) => {
    void renderFace(s.petImage || null)
    applyAnim(s.petAnimation !== false)
    void refreshBadge()
  })
}

void init()
