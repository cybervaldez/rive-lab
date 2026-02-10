import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default defineConfig({
  plugins: [tanstackStart()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
})
