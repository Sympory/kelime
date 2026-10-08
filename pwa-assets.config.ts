import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// `npm run icons` ile public/logo.svg'den favicon ve PWA simgeleri üretilir.
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
})
