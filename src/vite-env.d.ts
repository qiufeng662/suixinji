/// <reference types="vite/client" />

import type { SuixinjiApi } from '../electron/preload'

declare global {
  interface Window {
    suixinji?: SuixinjiApi
  }
}

export {}
