import type { JamNode, ScreenNode } from './types'

export interface XY {
  x: number
  y: number
}

// screen の実寸（リサイズ後は measured を優先）
export function screenSize(n: ScreenNode): { w: number; h: number } {
  const w = n.measured?.width ?? (typeof n.width === 'number' ? n.width : n.data.w)
  const h = n.measured?.height ?? (typeof n.height === 'number' ? n.height : n.data.h)
  return { w, h }
}

// 点を含む「最前面」の screen を返す。screen は常にトップレベル（position は絶対座標）。
export function findScreenAt(nodes: JamNode[], point: XY): ScreenNode | null {
  const screens = nodes.filter((n): n is ScreenNode => n.type === 'screen')
  for (let i = screens.length - 1; i >= 0; i--) {
    const s = screens[i]
    const { w, h } = screenSize(s)
    if (
      point.x >= s.position.x &&
      point.x <= s.position.x + w &&
      point.y >= s.position.y &&
      point.y <= s.position.y + h
    ) {
      return s
    }
  }
  return null
}
