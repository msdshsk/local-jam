import { test, expect, type Page } from '@playwright/test'

// React-Flow の HTML5 D&D は素の操作だと不安定なため、dataTransfer を差し込む合成dropで配置する。
async function dropAtom(page: Page, type: string, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ type, x, y }) => {
      const wrapper = document.querySelector('.react-flow')!.parentElement!
      const dt = { getData: (t: string) => (t === 'application/jam' ? `atom:${type}` : ''), files: [] }
      const ev = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(ev, 'dataTransfer', { value: dt })
      Object.defineProperty(ev, 'clientX', { value: x })
      Object.defineProperty(ev, 'clientY', { value: y })
      wrapper.dispatchEvent(ev)
    },
    { type, x, y }
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.react-flow')
})

test('アプリが読み込まれパレットとキャンバスが表示される', async ({ page }) => {
  await expect(page.locator('.react-flow')).toBeVisible()
  await expect(page.locator('aside').first()).toContainText('テンプレ')
})

test('部品をドロップすると描画される', async ({ page }) => {
  await dropAtom(page, 'input', 600, 320)
  const node = page.locator('.react-flow__node-part')
  await expect(node).toHaveCount(1)
  await expect(node).toContainText('入力')
})

test('棒グラフは値の数だけ棒を描く（全角入力でも）', async ({ page }) => {
  await dropAtom(page, 'barchart', 600, 320)
  await expect(page.locator('.react-flow__node-part svg rect')).toHaveCount(5) // 既定 30,70,45,90,60
})

test('UIはテキスト選択不可 / 入力欄だけ選択可（回帰）', async ({ page }) => {
  // メニュー枠などUIチップはドラッグ範囲選択できない
  await dropAtom(page, 'menu', 600, 300)
  await expect(page.locator('.react-flow__node-part').first().locator('span').first()).toHaveCSS(
    'user-select',
    'none'
  )
  // 入力欄のインライン編集は選択可（Ctrl+A等のため）
  await dropAtom(page, 'input', 950, 300)
  const inputNode = page.locator('.react-flow__node-part').last()
  await inputNode.locator('div').first().dblclick()
  await expect(inputNode.locator('input')).toHaveCSS('user-select', 'text')
})

test('インライン編集: IME確定Enterでは閉じない / 通常Enterで確定（回帰）', async ({ page }) => {
  await dropAtom(page, 'input', 600, 320)
  const node = page.locator('.react-flow__node-part')
  await node.locator('div').first().dblclick()
  await expect(node.locator('input')).toBeVisible()

  // 値セット + IME変換確定のEnter(isComposing:true) → 閉じない
  await page.evaluate(() => {
    const inp = document.querySelector('.react-flow__node-part input') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(inp, 'テスト')
    inp.dispatchEvent(new Event('input', { bubbles: true }))
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }))
  })
  await expect(node.locator('input')).toBeVisible() // まだ編集中（IME確定では閉じない）

  // 通常Enter(isComposing:false) → 確定して閉じ、ノードに反映（再描画は非同期なので locator で待つ）
  await page.evaluate(() => {
    const inp = document.querySelector('.react-flow__node-part input') as HTMLInputElement
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: false, bubbles: true, cancelable: true }))
  })
  await expect(node.locator('input')).toHaveCount(0)
  await expect(node).toContainText('テスト')
})
