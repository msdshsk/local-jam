import { defineConfig } from 'vitest/config'

// 純ロジックの単体テスト（ブラウザ不要・高速）
export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    environment: 'node'
  }
})
