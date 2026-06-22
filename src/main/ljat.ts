// .ljat = local-jam テンプレートパッケージ（ZIP）。
//   mimetype / template.json / assets/<画像>
// ノードに base64(data URL)で埋め込まれた画像を assets/ 実ファイルへ抽出して同梱し、
// 取り込み・利用時に data URL へ復元する。electron 非依存（jszip + Buffer のみ）＝単体テスト可。
import JSZip from 'jszip'

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp'
}
function mimeToExt(m: string): string {
  return MIME_EXT[m] ?? 'bin'
}
function extToMime(path: string): string {
  const e = (path.split('.').pop() ?? '').toLowerCase()
  for (const [m, x] of Object.entries(MIME_EXT)) if (x === e) return m
  return 'application/octet-stream'
}

type Data = Record<string, unknown>
type Node = { type?: string; data?: Data } & Record<string, unknown>

export interface TemplatePayload {
  id: string
  name: string
  nodes: unknown[]
  edges?: unknown[]
}

// data URL を assets/ へ抽出し src を相対参照へ書き換える関数を作る（重複は共有）
function makeExtractor(zip: JSZip): (data: Data | undefined) => Data | undefined {
  const map = new Map<string, string>()
  let n = 0
  return (data) => {
    if (!data) return data
    const src = data.src
    if (typeof src === 'string' && src.startsWith('data:')) {
      let path = map.get(src)
      if (!path) {
        const m = /^data:([^;]+);base64,(.*)$/s.exec(src)
        if (m) {
          path = `assets/img-${n++}.${mimeToExt(m[1])}`
          zip.file(path, Buffer.from(m[2], 'base64'))
          map.set(src, path)
        }
      }
      if (path) return { ...data, src: path }
    }
    return data
  }
}

// ノード(+ jgroupの子)の data に変換関数を適用
function mapNode(node: Node, fn: (d: Data | undefined) => Data | undefined): Node {
  let data = fn(node.data)
  if (node.type === 'jgroup' && data && Array.isArray((data as Data).children)) {
    const children = ((data as Data).children as { data?: Data }[]).map((c) => ({ ...c, data: fn(c.data) }))
    data = { ...(data as Data), children }
  }
  return { ...node, data }
}

export async function packTemplate(tpl: TemplatePayload): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/x-local-jam-template')
  const extract = makeExtractor(zip)
  const nodes = (tpl.nodes as Node[]).map((nd) => mapNode(nd, extract))
  zip.file('template.json', JSON.stringify({ version: 1, id: tpl.id, name: tpl.name, nodes, edges: tpl.edges ?? [] }))
  return zip.generateAsync({ type: 'nodebuffer' })
}

export async function unpackTemplate(buf: Buffer): Promise<TemplatePayload> {
  const zip = await JSZip.loadAsync(buf)
  const jf = zip.file('template.json')
  if (!jf) throw new Error('template.json missing')
  const j = JSON.parse(await jf.async('string'))
  const cache = new Map<string, string>()
  const inline = async (data: Data | undefined): Promise<Data | undefined> => {
    if (!data) return data
    const src = data.src
    if (typeof src === 'string' && src.startsWith('assets/')) {
      let url = cache.get(src)
      if (!url) {
        const f = zip.file(src)
        if (f) {
          url = `data:${extToMime(src)};base64,${(await f.async('nodebuffer')).toString('base64')}`
          cache.set(src, url)
        }
      }
      if (url) return { ...data, src: url }
    }
    return data
  }
  const nodes: Node[] = []
  for (const node of (j.nodes ?? []) as Node[]) {
    let data = await inline(node.data)
    if (node.type === 'jgroup' && data && Array.isArray((data as Data).children)) {
      const children: { data?: Data }[] = []
      for (const c of (data as Data).children as { data?: Data }[]) children.push({ ...c, data: await inline(c.data) })
      data = { ...(data as Data), children }
    }
    nodes.push({ ...node, data })
  }
  return { id: j.id, name: j.name, nodes, edges: j.edges ?? [] }
}

export async function readMeta(buf: Buffer): Promise<{ id: string; name: string }> {
  const zip = await JSZip.loadAsync(buf)
  const jf = zip.file('template.json')
  if (!jf) throw new Error('template.json missing')
  const j = JSON.parse(await jf.async('string'))
  return { id: String(j.id), name: String(j.name) }
}
