import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// GitHub Pages publica em https://<usuario>.github.io/documentacao_prioriza/
export default defineConfig({
  base: '/documentacao_prioriza/',
  plugins: [vue()],
})
