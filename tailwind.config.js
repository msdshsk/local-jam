/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // 手書き風フォント（未インストール時はsans-serifにフォールバック）。M2以降で同梱予定。
        hand: ['"Yomogi"', '"Klee One"', 'system-ui', 'sans-serif']
      },
      colors: {
        // ローファイ用モノクロ基調
        jam: {
          line: '#9ca3af',
          ink: '#374151',
          paper: '#ffffff',
          muted: '#6b7280'
        }
      }
    }
  },
  plugins: []
}
