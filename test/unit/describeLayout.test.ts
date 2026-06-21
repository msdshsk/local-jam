import { describe, it, expect } from 'vitest'
import { describeLayout } from '../../src/main/describeLayout'

const sample = {
  meta: { name: 'test.ljam' },
  edges: [],
  nodes: [
    { id: 's1', type: 'screen', position: { x: 0, y: 0 }, width: 600, height: 500, data: { title: 'ログイン', colorBg: '#ffffff' } },
    { id: 'h1', type: 'part', parentId: 's1', position: { x: 150, y: 60 }, width: 300, height: 32, data: { partType: 'heading', label: 'ログイン' } },
    { id: 'i1', type: 'part', parentId: 's1', position: { x: 150, y: 120 }, width: 300, height: 44, data: { partType: 'input', type: 'email', placeholder: 'メールアドレス' } },
    { id: 'tb', type: 'part', parentId: 's1', position: { x: 150, y: 200 }, width: 300, height: 200, data: { partType: 'table', columns: ['名前', '値'], rows: 3 } },
    { id: 'loose', type: 'part', position: { x: 2000, y: 2000 }, width: 120, height: 40, data: { partType: 'button', label: '画面外ボタン' } },
    { id: 'n1', type: 'note', position: { x: 0, y: 600 }, width: 200, height: 80, data: { text: 'メモです' } }
  ]
}

describe('describeLayout（MCP向け要約）', () => {
  const out = describeLayout(sample as never)

  it('画面名と部品が上から順に並ぶ', () => {
    expect(out).toContain('画面「ログイン」')
    const iHeading = out.indexOf('見出し「ログイン」')
    const iInput = out.indexOf('入力欄[email]')
    expect(iHeading).toBeGreaterThan(-1)
    expect(iInput).toBeGreaterThan(iHeading) // y順
  })
  it('テーブルは列と行数を要約', () => {
    expect(out).toContain('テーブル 列[名前・値] 3行')
  })
  it('画面外の部品とメモを区別して列挙', () => {
    expect(out).toContain('画面外の部品')
    expect(out).toContain('画面外ボタン')
    expect(out).toContain('付箋「メモです」')
  })
  it('空ドキュメントは明示', () => {
    expect(describeLayout({ nodes: [] } as never)).toContain('空')
  })
})
