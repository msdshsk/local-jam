import { describe, it, expect } from 'vitest'
import { packTemplate, unpackTemplate, readMeta } from '../../src/main/ljat'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

const tpl = {
  id: 'tpl_x',
  name: 'マイテンプレ',
  nodes: [
    { id: 'a', type: 'part', position: { x: 0, y: 0 }, data: { partType: 'image', src: PNG } },
    { id: 'b', type: 'part', position: { x: 0, y: 0 }, data: { partType: 'button', label: 'OK' } },
    {
      id: 'g',
      type: 'jgroup',
      position: { x: 0, y: 0 },
      data: { children: [{ cid: 'c1', x: 0, y: 0, w: 10, h: 10, data: { partType: 'image', src: PNG } }] }
    }
  ]
}

describe('ljat パッケージ（画像アセット同梱）', () => {
  it('pack→unpack で画像 src が data URL に復元される', async () => {
    const buf = await packTemplate(tpl)
    const back = await unpackTemplate(buf)
    expect(back.name).toBe('マイテンプレ')
    const img = back.nodes.find((n) => (n as { id: string }).id === 'a') as { data: { src: string } }
    expect(img.data.src).toBe(PNG)
  })

  it('jgroup 子ノードの画像も復元される', async () => {
    const buf = await packTemplate(tpl)
    const back = await unpackTemplate(buf)
    const g = back.nodes.find((n) => (n as { type: string }).type === 'jgroup') as {
      data: { children: { data: { src: string } }[] }
    }
    expect(g.data.children[0].data.src).toBe(PNG)
  })

  it('pack されたパッケージは assets/ に実ファイルを持ち template.json は data URL を含まない', async () => {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(await packTemplate(tpl))
    const names = Object.keys(zip.files)
    expect(names.some((n) => n.startsWith('assets/'))).toBe(true)
    const json = await zip.file('template.json')!.async('string')
    expect(json.includes('data:image')).toBe(false) // base64 はJSONから抜けている
  })

  it('同一画像は1ファイルに重複排除される', async () => {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(await packTemplate(tpl))
    const assetCount = Object.keys(zip.files).filter((n) => n.startsWith('assets/') && !zip.files[n].dir).length
    expect(assetCount).toBe(1) // 2箇所で同じPNG → 1ファイル
  })

  it('readMeta は id/name のみ返す', async () => {
    const meta = await readMeta(await packTemplate(tpl))
    expect(meta).toEqual({ id: 'tpl_x', name: 'マイテンプレ' })
  })
})
