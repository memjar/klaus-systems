import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm',
          dest: '.',
        },
        {
          src: 'node_modules/@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm',
          dest: '.',
        },
      ],
    }),
  ],
})
