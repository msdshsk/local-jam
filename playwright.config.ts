import { defineConfig, devices } from '@playwright/test'

// E2E: ビルド済みレンダラ(out/renderer)を serve して chromium で操作。
// ※ window.jam(Electron IPC) は無いので、保存/画像ピック/MCP等の main 依存機能は対象外。
const PORT = 4318

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx --yes serve out/renderer -l ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000
  }
})
