import type { CSSProperties } from 'react'
import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  type NodeChange,
  type EdgeChange,
  type Connection
} from '@xyflow/react'
import type {
  JamNode,
  JamEdge,
  PartType,
  PartData,
  ScreenData,
  GroupChild,
  NoteData,
  CommentData,
  MyTemplate,
  TemplateMeta
} from './types'
import { findScreenAt, type XY } from './geometry'
import { atomDefaults, resizePolicy } from './parts'
import { getBundle } from './bundles'
import { normalizeCells } from './tableUtil'

type PartN = Extract<JamNode, { type: 'part' }>
type GroupN = Extract<JamNode, { type: 'jgroup' }>
type AlignKind = 'left' | 'right' | 'top' | 'bottom' | 'distH' | 'distV'

const GROUP_PAD = 12
const FRAME_DRAG_HANDLE = '.jam-frame-title'
// フレーム本体はポインタ透過（=上でパンできる）。タイトル/リサイズ枠だけ操作可。
const FRAME_STYLE: CSSProperties = { pointerEvents: 'none' }

let counter = 0
function newId(prefix: string): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`
}

function nodeSize(n: JamNode): { w: number; h: number } {
  const w = n.measured?.width ?? (typeof n.width === 'number' ? n.width : 0)
  const h = n.measured?.height ?? (typeof n.height === 'number' ? n.height : 0)
  return { w, h }
}

// ドラッグ中のノードを同一親の兄弟ノードの辺にスナップ（左/中央/右・上/中央/下）
const SNAP = 6 // 画面px相当（zoomで割ってflow単位に）
function getHelperLines(pos: XY, dragged: JamNode, nodes: JamNode[], thr: number) {
  const sz = nodeSize(dragged)
  const dxs = [pos.x, pos.x + sz.w / 2, pos.x + sz.w]
  const dys = [pos.y, pos.y + sz.h / 2, pos.y + sz.h]
  let snapX: number | undefined
  let snapY: number | undefined
  let vert: number | undefined
  let horiz: number | undefined
  let bx = thr + 1
  let by = thr + 1
  for (const n of nodes) {
    if (n.id === dragged.id || n.parentId !== dragged.parentId || n.hidden) continue
    const ns = nodeSize(n)
    const nxs = [n.position.x, n.position.x + ns.w / 2, n.position.x + ns.w]
    const nys = [n.position.y, n.position.y + ns.h / 2, n.position.y + ns.h]
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const ddx = Math.abs(dxs[i] - nxs[j])
        if (ddx < bx) {
          bx = ddx
          snapX = pos.x + (nxs[j] - dxs[i])
          vert = nxs[j]
        }
        const ddy = Math.abs(dys[i] - nys[j])
        if (ddy < by) {
          by = ddy
          snapY = pos.y + (nys[j] - dys[i])
          horiz = nys[j]
        }
      }
    }
  }
  return {
    x: bx <= thr ? snapX : undefined,
    y: by <= thr ? snapY : undefined,
    vert: bx <= thr ? vert : undefined,
    horiz: by <= thr ? horiz : undefined
  }
}

// 親チェーンを辿って絶対座標を求める
function absPos(n: JamNode, byId: Map<string, JamNode>): XY {
  let x = n.position.x
  let y = n.position.y
  let p = n.parentId ? byId.get(n.parentId) : undefined
  const seen = new Set<string>()
  while (p && !seen.has(p.id)) {
    seen.add(p.id)
    x += p.position.x
    y += p.position.y
    p = p.parentId ? byId.get(p.parentId) : undefined
  }
  return { x, y }
}

function topZ(nodes: JamNode[]): number {
  let m = 0
  for (const n of nodes) if (typeof n.zIndex === 'number') m = Math.max(m, n.zIndex)
  return m
}

function bottomZ(nodes: JamNode[]): number {
  let m = 0
  let found = false
  for (const n of nodes) {
    if (typeof n.zIndex === 'number') {
      m = found ? Math.min(m, n.zIndex) : n.zIndex
      found = true
    }
  }
  return found ? m : 0
}

// React-Flowの要件: 親は必ず子より前。深さ昇順に安定ソート。
function sortByParent(nodes: JamNode[]): JamNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const depthOf = (n: JamNode): number => {
    let d = 0
    let cur: JamNode | undefined = n
    const seen = new Set<string>()
    while (cur?.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
      seen.add(cur.id)
      d += 1
      cur = byId.get(cur.parentId)
    }
    return d
  }
  return nodes
    .map((n, i) => ({ n, i, d: depthOf(n) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((x) => x.n)
}

// 親が消えた子(loose part)を連鎖除去
function pruneOrphans(nodes: JamNode[]): JamNode[] {
  let next = nodes
  let changed = true
  while (changed) {
    const ids = new Set(next.map((n) => n.id))
    const before = next.length
    next = next.filter((n) => !n.parentId || ids.has(n.parentId))
    changed = next.length !== before
  }
  return next
}

// 旧形式の GroupChild（partType/label/placeholder/options を直持ち）を
// 新形式（data: PartData）へ移行。読込・テンプレ展開時に通す。
function migrateNodes(nodes: JamNode[]): JamNode[] {
  return nodes.map((n) => {
    if (n.type !== 'jgroup') return n
    const children = n.data.children.map((c) => {
      const raw = c as unknown as Record<string, unknown>
      if (raw.data) return c
      const data: PartData = {
        partType: raw.partType as PartData['partType'],
        w: c.w,
        h: c.h,
        label: raw.label as string | undefined,
        placeholder: raw.placeholder as string | undefined,
        options: raw.options as string[] | undefined
      }
      return { cid: c.cid, x: c.x, y: c.y, w: c.w, h: c.h, data }
    })
    return { ...n, data: { ...n.data, children } }
  })
}

// グループ(コンポジット)を解除し、内包childを独立 part ノードへ展開
function ungroupNodes(nodes: JamNode[], groupIds: Set<string>): JamNode[] {
  const out: JamNode[] = []
  for (const n of nodes) {
    if (n.type === 'jgroup' && groupIds.has(n.id)) {
      const np = n.parentId
      let z = n.zIndex ?? 0
      for (const c of n.data.children) {
        z += 1
        out.push({
          id: newId('part'),
          type: 'part',
          parentId: np,
          extent: np ? 'parent' : undefined,
          position: { x: n.position.x + c.x, y: n.position.y + c.y },
          width: c.w,
          height: c.h,
          data: { ...c.data, w: c.w, h: c.h },
          zIndex: z,
          selected: true
        })
      }
    } else {
      out.push(n.selected ? { ...n, selected: false } : n)
    }
  }
  return sortByParent(out)
}

function makePart(
  abs: XY,
  size: { w: number; h: number },
  data: PartData,
  screen: JamNode | null,
  z: number
): JamNode {
  const base: JamNode = {
    id: newId('part'),
    type: 'part',
    position: abs,
    width: size.w,
    height: size.h,
    data,
    zIndex: z
  }
  if (screen) {
    return {
      ...base,
      parentId: screen.id,
      extent: 'parent',
      position: { x: abs.x - screen.position.x, y: abs.y - screen.position.y }
    }
  }
  return base
}

// 自己完結スナップショット(トップレベル=parentId無し&絶対座標)をドロップ位置へ展開
function instantiateTemplate(snapshot: JamNode[], existing: JamNode[], at: XY): JamNode[] {
  if (snapshot.length === 0) return []
  snapshot = migrateNodes(snapshot)
  const copiedIds = new Set(snapshot.map((n) => n.id))
  const idMap = new Map<string, string>()
  for (const c of snapshot) idMap.set(c.id, newId(c.type))
  const topLevel = snapshot.filter((c) => !c.parentId)
  let delta = { x: 24, y: 24 }
  if (topLevel.length > 0) {
    const ax = Math.min(...topLevel.map((c) => c.position.x))
    const ay = Math.min(...topLevel.map((c) => c.position.y))
    delta = { x: at.x - ax, y: at.y - ay }
  }
  const created: JamNode[] = []
  for (const c of snapshot) {
    const clone = JSON.parse(JSON.stringify(c)) as JamNode
    clone.id = idMap.get(c.id) as string
    clone.selected = true
    if (clone.type === 'jgroup') {
      clone.data.children = clone.data.children.map((ch) => ({ ...ch, cid: newId('c') }))
    }
    if (c.parentId && copiedIds.has(c.parentId)) {
      clone.parentId = idMap.get(c.parentId) as string
    } else {
      clone.parentId = undefined
      clone.extent = undefined
      clone.position = { x: c.position.x + delta.x, y: c.position.y + delta.y }
      clone.zIndex = topZ([...existing, ...created]) + 1
      if (c.type !== 'screen') {
        const screen = findScreenAt(existing, clone.position)
        if (screen) {
          clone.parentId = screen.id
          clone.extent = 'parent'
          clone.position = {
            x: clone.position.x - screen.position.x,
            y: clone.position.y - screen.position.y
          }
        }
      }
    }
    created.push(clone)
  }
  return created
}

interface JamState {
  nodes: JamNode[]
  edges: JamEdge[]
  onNodesChange: (c: NodeChange<JamNode>[]) => void
  onEdgesChange: (c: EdgeChange<JamEdge>[]) => void
  onConnect: (c: Connection) => void
  addFrame: (pos: XY) => void
  addAtom: (type: PartType, pos: XY, init?: Partial<PartData>) => void
  addBundle: (bundleId: string, pos: XY) => void
  addImage: (src: string, pos: XY, w: number, h: number) => void
  setImageSrc: (id: string, src: string, w: number, h: number) => void
  groupSelected: () => void
  ungroupSelected: () => void
  ungroupById: (id: string) => void
  bringToFrontSelected: () => void
  sendToBackSelected: () => void
  scaleSelected: (factor: number) => void
  updatePartData: (id: string, patch: Partial<PartData>) => void
  updateGroupChild: (groupId: string, cid: string, patch: Partial<PartData>) => void
  deleteSelected: () => void
  selectOnly: (id: string) => void
  clipboard: JamNode[]
  copySelected: () => void
  paste: (at?: XY) => void
  loadSnapshot: (nodes: JamNode[], edges: JamEdge[]) => void
  newDocument: () => void
  filePath: string | null
  setFilePath: (p: string | null) => void
  inspectorOpen: boolean
  setInspectorOpen: (b: boolean) => void
  toggleInspector: () => void
  updateScreenData: (id: string, patch: Partial<ScreenData>) => void
  alignSelected: (kind: AlignKind) => void
  notesVisible: boolean
  toggleNotesVisible: () => void
  addNote: (pos: XY) => void
  addComment: (pos: XY) => void
  updateNoteText: (id: string, text: string) => void
  updateCommentText: (id: string, text: string) => void
  toggleComment: (id: string) => void
  connectSelected: () => void
  updateEdgeLabel: (id: string, label: string) => void
  editingTableId: string | null
  openTableEditor: (id: string) => void
  closeTableEditor: () => void
  namingTemplate: boolean
  openTemplateNamer: () => void
  closeTemplateNamer: () => void
  updateTable: (id: string, patch: { columns?: string[]; rows?: number; cells?: string[][] }) => void
  helpers: { vx?: number; hy?: number } | null
  zoom: number
  setZoom: (z: number) => void
  clearHelpers: () => void
  myTemplates: TemplateMeta[]
  refreshTemplates: () => void
  saveSelectionAsTemplate: (name: string) => void
  deleteTemplate: (id: string) => void
  dropTemplate: (id: string, pos: XY) => void
  exportTemplate: (id: string) => void
  importTemplate: () => void
}

export const useJamStore = create<JamState>((set, get) => ({
  nodes: [],
  edges: [],
  clipboard: [],
  filePath: null,
  inspectorOpen: false,
  notesVisible: true,
  editingTableId: null,
  namingTemplate: false,
  helpers: null,
  zoom: 0.5,
  myTemplates: [],

  onNodesChange: (changes) =>
    set((s) => {
      let helpers: { vx?: number; hy?: number } | null = null
      // ドラッグ中・最終ドロップ(dragging:false)の両方にスナップを適用（ドロップ時のズレ防止）。
      // ガイド線はドラッグ中のみ表示。
      const pos = changes.filter(
        (c): c is Extract<NodeChange<JamNode>, { type: 'position' }> =>
          c.type === 'position' && !!c.position
      )
      if (pos.length === 1) {
        const c = pos[0]
        const dragged = s.nodes.find((n) => n.id === c.id)
        if (dragged && c.position) {
          const thr = SNAP / (s.zoom || 1)
          const hl = getHelperLines(c.position, dragged, s.nodes, thr)
          if (hl.x !== undefined || hl.y !== undefined) {
            c.position = { x: hl.x ?? c.position.x, y: hl.y ?? c.position.y }
            if (c.dragging) {
              const byId = new Map(s.nodes.map((n) => [n.id, n]))
              const parent = dragged.parentId ? byId.get(dragged.parentId) : undefined
              const pa = parent ? absPos(parent, byId) : { x: 0, y: 0 }
              helpers = {
                vx: hl.vert !== undefined ? pa.x + hl.vert : undefined,
                hy: hl.horiz !== undefined ? pa.y + hl.horiz : undefined
              }
            }
          }
        }
      }
      return { nodes: pruneOrphans(applyNodeChanges(changes, s.nodes) as JamNode[]), helpers }
    }),

  setZoom: (z) => set(() => ({ zoom: z })),
  clearHelpers: () => set(() => ({ helpers: null })),

  onEdgesChange: (c) =>
    set((s) => ({ edges: applyEdgeChanges(c, s.edges) as JamEdge[] })),

  onConnect: (c) =>
    set((s) => ({ edges: addEdge({ ...c, type: 'annotation' }, s.edges) })),

  addFrame: (pos) =>
    set((s) => {
      const data: ScreenData = { title: '新しい画面', w: 1440, h: 1024, device: 'desktop' }
      const node: JamNode = {
        id: newId('screen'),
        type: 'screen',
        position: pos,
        width: data.w,
        height: data.h,
        data,
        // 分類ゾーンは基本最背面。他ノードより下に置く。
        zIndex: bottomZ(s.nodes) - 1,
        dragHandle: FRAME_DRAG_HANDLE,
        style: FRAME_STYLE
      }
      return { nodes: sortByParent([...s.nodes, node]) }
    }),

  addAtom: (type, pos, init) =>
    set((s) => {
      const screen = findScreenAt(s.nodes, pos)
      const d = atomDefaults(type)
      const data: PartData = { partType: type, w: d.w, h: d.h, ...d.data, ...init }
      const node = makePart(pos, { w: d.w, h: d.h }, data, screen, topZ(s.nodes) + 1)
      return { nodes: sortByParent([...s.nodes, node]) }
    }),

  addImage: (src, pos, w, h) =>
    set((s) => {
      const screen = findScreenAt(s.nodes, pos)
      const data: PartData = { partType: 'image', w, h, src }
      const node = makePart(pos, { w, h }, data, screen, topZ(s.nodes) + 1)
      return { nodes: sortByParent([...s.nodes, node]) }
    }),

  setImageSrc: (id, src, w, h) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id && n.type === 'part'
          ? { ...n, width: w, height: h, data: { ...n.data, src, w, h } }
          : n
      )
    })),

  // バンドルはコンポジットなグループ1ノードとして展開
  addBundle: (bundleId, pos) =>
    set((s) => {
      const bundle = getBundle(bundleId)
      if (!bundle) return {}
      const screen = findScreenAt(s.nodes, pos)
      const minx = Math.min(...bundle.atoms.map((a) => a.dx))
      const miny = Math.min(...bundle.atoms.map((a) => a.dy))
      const maxx = Math.max(...bundle.atoms.map((a) => a.dx + a.w))
      const maxy = Math.max(...bundle.atoms.map((a) => a.dy + a.h))
      const children: GroupChild[] = bundle.atoms.map((a) => ({
        cid: newId('c'),
        x: a.dx - minx + GROUP_PAD,
        y: a.dy - miny + GROUP_PAD,
        w: a.w,
        h: a.h,
        data: { partType: a.type, w: a.w, h: a.h, ...a.data } as PartData
      }))
      const groupAbs: XY = { x: pos.x + minx - GROUP_PAD, y: pos.y + miny - GROUP_PAD }
      const groupNode: JamNode = {
        id: newId('jgroup'),
        type: 'jgroup',
        position: groupAbs,
        width: maxx - minx + GROUP_PAD * 2,
        height: maxy - miny + GROUP_PAD * 2,
        data: { children },
        zIndex: topZ(s.nodes) + 1
      }
      if (screen) {
        groupNode.parentId = screen.id
        groupNode.extent = 'parent'
        groupNode.position = { x: groupAbs.x - screen.position.x, y: groupAbs.y - screen.position.y }
      }
      return { nodes: sortByParent([...s.nodes, groupNode]) }
    }),

  // 選択中の loose part を1グループにまとめる（同一親内・2個以上）
  groupSelected: () =>
    set((s) => {
      const parts = s.nodes.filter((n): n is PartN => n.type === 'part' && !!n.selected)
      if (parts.length < 2) return {}
      const parentId = parts[0].parentId
      if (!parts.every((n) => n.parentId === parentId)) return {}
      // 重なり順(z)昇順に並べ、グループ内の描画順＝元の前後関係を保つ
      parts.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      const minx = Math.min(...parts.map((p) => p.position.x))
      const miny = Math.min(...parts.map((p) => p.position.y))
      const maxx = Math.max(...parts.map((p) => p.position.x + nodeSize(p).w))
      const maxy = Math.max(...parts.map((p) => p.position.y + nodeSize(p).h))
      const gx = minx - GROUP_PAD
      const gy = miny - GROUP_PAD
      const children: GroupChild[] = parts.map((p) => {
        const sz = nodeSize(p)
        return {
          cid: newId('c'),
          x: p.position.x - gx,
          y: p.position.y - gy,
          w: sz.w,
          h: sz.h,
          data: { ...(JSON.parse(JSON.stringify(p.data)) as PartData), w: sz.w, h: sz.h }
        }
      })
      const groupNode: JamNode = {
        id: newId('jgroup'),
        type: 'jgroup',
        position: { x: gx, y: gy },
        width: maxx - minx + GROUP_PAD * 2,
        height: maxy - miny + GROUP_PAD * 2,
        data: { children },
        selected: true,
        zIndex: topZ(s.nodes) + 1
      }
      if (parentId) {
        groupNode.parentId = parentId
        groupNode.extent = 'parent'
      }
      const ids = new Set(parts.map((p) => p.id))
      const rest = s.nodes.filter((n) => !ids.has(n.id)).map((n) => (n.selected ? { ...n, selected: false } : n))
      return { nodes: sortByParent([...rest, groupNode]) }
    }),

  ungroupSelected: () =>
    set((s) => {
      const ids = new Set(s.nodes.filter((n) => n.selected && n.type === 'jgroup').map((n) => n.id))
      if (ids.size === 0) return {}
      return { nodes: ungroupNodes(s.nodes, ids) }
    }),

  ungroupById: (id) =>
    set((s) => {
      if (!s.nodes.some((n) => n.id === id && n.type === 'jgroup')) return {}
      return { nodes: ungroupNodes(s.nodes, new Set([id])) }
    }),

  // 重なり順は「操作」からのみ変更（選択では変えない）。フレーム含め全ノード対象。
  bringToFrontSelected: () =>
    set((s) => {
      const ids = new Set(s.nodes.filter((n) => n.selected).map((n) => n.id))
      if (ids.size === 0) return {}
      let z = topZ(s.nodes)
      return { nodes: s.nodes.map((n) => (ids.has(n.id) ? { ...n, zIndex: ++z } : n)) }
    }),

  sendToBackSelected: () =>
    set((s) => {
      const ids = new Set(s.nodes.filter((n) => n.selected).map((n) => n.id))
      if (ids.size === 0) return {}
      let z = bottomZ(s.nodes)
      return { nodes: s.nodes.map((n) => (ids.has(n.id) ? { ...n, zIndex: --z } : n)) }
    }),

  scaleSelected: (factor) =>
    set((s) => {
      const ids = new Set(s.nodes.filter((n) => n.selected && n.type === 'part').map((n) => n.id))
      if (ids.size === 0) return {}
      return {
        nodes: s.nodes.map((n) => {
          if (n.type !== 'part' || !ids.has(n.id)) return n
          const { policy, minW, minH } = resizePolicy(n.data.partType)
          if (policy === 'none') return n
          const cur = nodeSize(n)
          const w = Math.max(minW, Math.round(cur.w * factor))
          const h = policy === 'width' ? cur.h : Math.max(minH, Math.round(cur.h * factor))
          return { ...n, width: w, height: h, data: { ...n.data, w, h } }
        })
      }
    }),

  updatePartData: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id && n.type === 'part' ? { ...n, data: { ...n.data, ...patch } } : n
      )
    })),

  updateGroupChild: (groupId, cid, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== groupId || n.type !== 'jgroup') return n
        const g: GroupN = n
        return {
          ...g,
          data: {
            ...g.data,
            children: g.data.children.map((c) =>
              c.cid === cid ? { ...c, data: { ...c.data, ...patch } } : c
            )
          }
        }
      })
    })),

  deleteSelected: () =>
    set((s) => {
      const ids = new Set(s.nodes.filter((n) => n.selected).map((n) => n.id))
      if (ids.size === 0) return {}
      const nodes = pruneOrphans(s.nodes.filter((n) => !ids.has(n.id)))
      const remaining = new Set(nodes.map((n) => n.id))
      const edges = s.edges.filter((e) => remaining.has(e.source) && remaining.has(e.target))
      return { nodes, edges }
    }),

  selectOnly: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id }))
    })),

  toggleNotesVisible: () => set((s) => ({ notesVisible: !s.notesVisible })),

  addNote: (pos) =>
    set((s) => {
      const data: NoteData = { text: 'メモ', w: 200, h: 120 }
      const node: JamNode = {
        id: newId('note'),
        type: 'note',
        position: pos,
        width: 200,
        height: 120,
        data,
        zIndex: topZ(s.nodes) + 1
      }
      return { nodes: sortByParent([...s.nodes, node]) }
    }),

  addComment: (pos) =>
    set((s) => {
      const data: CommentData = { text: '', open: true }
      const node: JamNode = {
        id: newId('comment'),
        type: 'comment',
        position: pos,
        width: 28,
        height: 28,
        data,
        zIndex: topZ(s.nodes) + 1
      }
      return { nodes: sortByParent([...s.nodes, node]) }
    }),

  updateNoteText: (id, text) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id && n.type === 'note' ? { ...n, data: { ...n.data, text } } : n))
    })),

  updateCommentText: (id, text) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id && n.type === 'comment' ? { ...n, data: { ...n.data, text } } : n
      )
    })),

  toggleComment: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id && n.type === 'comment' ? { ...n, data: { ...n.data, open: !n.data.open } } : n
      )
    })),

  // 選択中の2ノードを注釈線でつなぐ
  connectSelected: () =>
    set((s) => {
      const sel = s.nodes.filter((n) => n.selected)
      if (sel.length !== 2) return {}
      const edge: JamEdge = {
        id: newId('edge'),
        source: sel[0].id,
        target: sel[1].id,
        sourceHandle: 's',
        targetHandle: 't',
        type: 'annotation',
        data: { label: '' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280', width: 18, height: 18 }
      }
      return { edges: [...s.edges, edge] }
    }),

  updateEdgeLabel: (id, label) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, data: { ...e.data, label } } : e))
    })),

  openTableEditor: (id) => set(() => ({ editingTableId: id })),
  closeTableEditor: () => set(() => ({ editingTableId: null })),

  // テンプレート化の名前入力（Electronは window.prompt 非対応のため自前モーダル）
  openTemplateNamer: () => set(() => ({ namingTemplate: true })),
  closeTemplateNamer: () => set(() => ({ namingTemplate: false })),

  // テーブル専用: 列(見出し)・行数・セルを正規化して保存
  updateTable: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== id || n.type !== 'part') return n
        const columns = patch.columns ?? n.data.columns ?? ['列1', '列2', '列3']
        const rows = patch.rows ?? n.data.rows ?? 3
        const cells = normalizeCells(columns.length, rows, patch.cells ?? n.data.cells)
        return { ...n, data: { ...n.data, columns, rows, cells } }
      })
    })),

  // 読込: 選択状態はクリアし、親→子順を保証して差し替え
  loadSnapshot: (nodes, edges) =>
    set(() => ({
      nodes: sortByParent(migrateNodes(nodes).map((n) => ({ ...n, selected: false }))),
      edges,
      clipboard: []
    })),

  newDocument: () => set(() => ({ nodes: [], edges: [], clipboard: [], filePath: null })),

  setFilePath: (p) => set(() => ({ filePath: p })),

  setInspectorOpen: (b) => set(() => ({ inspectorOpen: b })),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),

  updateScreenData: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id && n.type === 'screen' ? { ...n, data: { ...n.data, ...patch } } : n
      )
    })),

  // 選択中の部品/グループを整列。絶対座標で計算→各ノードのpositionへ差分反映（親混在OK）
  alignSelected: (kind) =>
    set((s) => {
      const sel = s.nodes.filter((n) => n.selected && n.type !== 'screen')
      if (sel.length < 2) return {}
      if ((kind === 'distH' || kind === 'distV') && sel.length < 3) return {}
      const byId = new Map(s.nodes.map((n) => [n.id, n]))
      const rects = sel.map((n) => {
        const a = absPos(n, byId)
        const sz = nodeSize(n)
        return { id: n.id, x: a.x, y: a.y, w: sz.w, h: sz.h }
      })
      const minX = Math.min(...rects.map((r) => r.x))
      const maxR = Math.max(...rects.map((r) => r.x + r.w))
      const minY = Math.min(...rects.map((r) => r.y))
      const maxB = Math.max(...rects.map((r) => r.y + r.h))
      const target = new Map<string, { x?: number; y?: number }>()
      if (kind === 'left') rects.forEach((r) => target.set(r.id, { x: minX }))
      else if (kind === 'right') rects.forEach((r) => target.set(r.id, { x: maxR - r.w }))
      else if (kind === 'top') rects.forEach((r) => target.set(r.id, { y: minY }))
      else if (kind === 'bottom') rects.forEach((r) => target.set(r.id, { y: maxB - r.h }))
      else if (kind === 'distH') {
        const sorted = [...rects].sort((a, b) => a.x - b.x)
        const sumW = sorted.reduce((acc, r) => acc + r.w, 0)
        const gap = (maxR - minX - sumW) / (sorted.length - 1)
        let cx = minX
        sorted.forEach((r) => {
          target.set(r.id, { x: cx })
          cx += r.w + gap
        })
      } else if (kind === 'distV') {
        const sorted = [...rects].sort((a, b) => a.y - b.y)
        const sumH = sorted.reduce((acc, r) => acc + r.h, 0)
        const gap = (maxB - minY - sumH) / (sorted.length - 1)
        let cy = minY
        sorted.forEach((r) => {
          target.set(r.id, { y: cy })
          cy += r.h + gap
        })
      }
      const rectById = new Map(rects.map((r) => [r.id, r]))
      return {
        nodes: s.nodes.map((n) => {
          const t = target.get(n.id)
          if (!t) return n
          const r = rectById.get(n.id)
          if (!r) return n
          const dx = t.x !== undefined ? t.x - r.x : 0
          const dy = t.y !== undefined ? t.y - r.y : 0
          if (dx === 0 && dy === 0) return n
          return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
        })
      }
    }),

  // 範囲選択した全ノードをスナップショットとしてコピー
  copySelected: () =>
    set((s) => ({
      clipboard: s.nodes.filter((n) => n.selected).map((n) => JSON.parse(JSON.stringify(n)) as JamNode)
    })),

  // 貼り付け。at 指定時はコピー集合の左上が at に来るよう配置（右クリック位置ペースト）。
  // 未指定時は +24 ずらし。コピー集合内の親子は維持、集合外の親はフレーム吸着に解決。
  paste: (at) =>
    set((s) => {
      if (s.clipboard.length === 0) return {}
      const byId = new Map(s.nodes.map((n) => [n.id, n]))
      const copiedIds = new Set(s.clipboard.map((n) => n.id))
      const idMap = new Map<string, string>()
      for (const c of s.clipboard) idMap.set(c.id, newId(c.type))
      // トップレベル（親がコピー集合外）の絶対座標から配置デルタを決める
      const topLevel = s.clipboard.filter((c) => !(c.parentId && copiedIds.has(c.parentId)))
      let delta = { x: 24, y: 24 }
      if (at && topLevel.length > 0) {
        const abs = topLevel.map((c) => absPos(c, byId))
        const ax = Math.min(...abs.map((a) => a.x))
        const ay = Math.min(...abs.map((a) => a.y))
        delta = { x: at.x - ax, y: at.y - ay }
      }
      const created: JamNode[] = []
      for (const c of s.clipboard) {
        const clone = JSON.parse(JSON.stringify(c)) as JamNode
        clone.id = idMap.get(c.id) as string
        clone.selected = true
        if (clone.type === 'jgroup') {
          clone.data.children = clone.data.children.map((ch) => ({ ...ch, cid: newId('c') }))
        }
        if (c.parentId && copiedIds.has(c.parentId)) {
          clone.parentId = idMap.get(c.parentId) as string
        } else {
          const a = absPos(c, byId)
          clone.parentId = undefined
          clone.extent = undefined
          clone.position = { x: a.x + delta.x, y: a.y + delta.y }
          clone.zIndex = topZ([...s.nodes, ...created]) + 1
          if (c.type !== 'screen') {
            const screen = findScreenAt(s.nodes, clone.position)
            if (screen) {
              clone.parentId = screen.id
              clone.extent = 'parent'
              clone.position = {
                x: clone.position.x - screen.position.x,
                y: clone.position.y - screen.position.y
              }
            }
          }
        }
        created.push(clone)
      }
      const existing = s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n))
      return { nodes: sortByParent([...existing, ...created]) }
    }),

  refreshTemplates: async () => {
    if (!window.jam?.templatesList) return
    set({ myTemplates: await window.jam.templatesList() })
  },

  // 選択範囲を自己完結スナップショット化して保存（トップレベルは絶対座標・親なし）。
  // 画像等は main 側で .ljat の assets に抽出される。
  saveSelectionAsTemplate: async (name) => {
    const s = get()
    const sel = s.nodes.filter((n) => n.selected)
    if (sel.length === 0 || !window.jam?.templatesSave) return
    const selIds = new Set(sel.map((n) => n.id))
    const byId = new Map(s.nodes.map((n) => [n.id, n]))
    const snapshot = sel.map((n) => {
      const clone = JSON.parse(JSON.stringify(n)) as JamNode
      clone.selected = false
      if (!(n.parentId && selIds.has(n.parentId))) {
        const a = absPos(n, byId)
        clone.parentId = undefined
        clone.extent = undefined
        clone.position = a
      }
      return clone
    })
    const list = await window.jam.templatesSave({ name, nodes: snapshot })
    set({ myTemplates: list })
  },

  deleteTemplate: async (id) => {
    if (!window.jam?.templatesRemove) return
    set({ myTemplates: await window.jam.templatesRemove(id) })
  },

  // 配置: 本体（画像はassetsからdata URLへ復元済み）を都度取得して展開
  dropTemplate: async (id, pos) => {
    if (!window.jam?.templatesGet) return
    const tpl = (await window.jam.templatesGet(id)) as MyTemplate | null
    if (!tpl || !Array.isArray(tpl.nodes)) return
    set((s) => {
      const created = instantiateTemplate(tpl.nodes, s.nodes, pos)
      const existing = s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n))
      return { nodes: sortByParent([...existing, ...created]) }
    })
  },

  exportTemplate: async (id) => {
    if (!window.jam?.templatesExport) return
    await window.jam.templatesExport(id)
  },

  importTemplate: async () => {
    if (!window.jam?.templatesImport) return
    set({ myTemplates: await window.jam.templatesImport() })
  }
}))
