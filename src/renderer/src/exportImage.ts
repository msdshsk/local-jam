import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import type { ReactFlowInstance } from '@xyflow/react'
import type { JamNode } from './types'

type RF = ReactFlowInstance
interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const PAD = 40 // 周囲の余白(px)
const SCALE = 2 // 解像度倍率（くっきり）

// 書き出し時に拾いたくないReact-Flowのチョーム類（リサイズ枠/接続点/帰属表記/パネル/背景）
function exportFilter(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true
  const c = el.classList
  return !(
    c.contains('react-flow__handle') ||
    c.contains('react-flow__resize-control') ||
    c.contains('react-flow__attribution') ||
    c.contains('react-flow__panel') ||
    c.contains('react-flow__background')
  )
}

// 子ノード(parentId付き)も含め、絶対座標でバウンディングボックスを算出
function absBounds(targets: JamNode[], all: JamNode[]): Rect | null {
  if (targets.length === 0) return null
  const byId = new Map(all.map((n) => [n.id, n]))
  const absOf = (n: JamNode): { x: number; y: number } => {
    let x = n.position.x
    let y = n.position.y
    let p = n.parentId
    while (p) {
      const par = byId.get(p)
      if (!par) break
      x += par.position.x
      y += par.position.y
      p = par.parentId
    }
    return { x, y }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of targets) {
    const { x, y } = absOf(n)
    const w = n.measured?.width ?? (n.width as number | undefined) ?? 0
    const h = n.measured?.height ?? (n.height as number | undefined) ?? 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

interface Page {
  dataUrl: string
  w: number
  h: number
}

// 指定矩形(flow座標)をPNG化
async function renderRect(bounds: Rect): Promise<Page> {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!viewport) throw new Error('viewport not found')
  const w = Math.max(1, Math.round(bounds.width * SCALE + PAD * 2))
  const h = Math.max(1, Math.round(bounds.height * SCALE + PAD * 2))
  const transform = `translate(${PAD - bounds.x * SCALE}px, ${PAD - bounds.y * SCALE}px) scale(${SCALE})`
  const dataUrl = await toPng(viewport, {
    backgroundColor: '#ffffff',
    width: w,
    height: h,
    filter: exportFilter,
    pixelRatio: 1,
    cacheBust: true,
    style: { width: `${w}px`, height: `${h}px`, transform }
  })
  return { dataUrl, w, h }
}

// PNG書き出し。selectionOnly=true なら選択ノードのみ。戻り値は data URL（無ければnull）
export async function exportPng(rf: RF, selectionOnly: boolean): Promise<string | null> {
  const all = rf.getNodes() as unknown as JamNode[]
  const targets = selectionOnly ? all.filter((n) => n.selected) : all
  const bounds = absBounds(targets, all)
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null
  const { dataUrl } = await renderRect(bounds)
  return dataUrl
}

function pagesToPdf(pages: Page[]): string {
  const first = pages[0]
  const doc = new jsPDF({
    unit: 'px',
    format: [first.w, first.h],
    orientation: first.w >= first.h ? 'landscape' : 'portrait'
  })
  doc.addImage(first.dataUrl, 'PNG', 0, 0, first.w, first.h, undefined, 'FAST')
  for (let i = 1; i < pages.length; i++) {
    const p = pages[i]
    doc.addPage([p.w, p.h], p.w >= p.h ? 'landscape' : 'portrait')
    doc.addImage(p.dataUrl, 'PNG', 0, 0, p.w, p.h, undefined, 'FAST')
  }
  // data URL の base64 部分を返す
  return doc.output('datauristring').split(',')[1]
}

// PDF書き出し。perScreen=true なら 1画面=1ページ。戻り値は base64文字列（無ければnull）
export async function exportPdf(rf: RF, perScreen: boolean): Promise<string | null> {
  const all = rf.getNodes() as unknown as JamNode[]
  if (all.length === 0) return null
  const pages: Page[] = []
  if (perScreen) {
    const screens = all.filter((n) => n.type === 'screen')
    if (screens.length === 0) return null
    for (const s of screens) {
      const b = absBounds([s], all)
      if (b) pages.push(await renderRect(b))
    }
  } else {
    const b = absBounds(all, all)
    if (!b) return null
    pages.push(await renderRect(b))
  }
  if (pages.length === 0) return null
  return pagesToPdf(pages)
}
