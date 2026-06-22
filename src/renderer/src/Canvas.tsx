import { useCallback, useEffect, useState, type DragEvent, type MouseEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ViewportPortal,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes
} from '@xyflow/react'
import { useJamStore } from './store'
import { findScreenAt, type XY } from './geometry'
import { loadImageDims, fitSize, readFileAsDataURL } from './imageUtil'
import ScreenNode from './nodes/ScreenNode'
import PartNode from './nodes/PartNode'
import GroupNode from './nodes/GroupNode'
import NoteNode from './nodes/NoteNode'
import CommentNode from './nodes/CommentNode'
import AnnotationEdge from './edges/AnnotationEdge'
import ContextMenu from './components/ContextMenu'
import type { JamNode, JamEdge, PartType } from './types'

const nodeTypes = {
  screen: ScreenNode,
  jgroup: GroupNode,
  part: PartNode,
  note: NoteNode,
  comment: CommentNode
} as NodeTypes

const edgeTypes = {
  annotation: AnnotationEdge
} as EdgeTypes

interface MinimalMouse {
  preventDefault: () => void
  clientX: number
  clientY: number
}

export default function Canvas() {
  const nodes = useJamStore((s) => s.nodes)
  const edges = useJamStore((s) => s.edges)
  const onNodesChange = useJamStore((s) => s.onNodesChange)
  const onEdgesChange = useJamStore((s) => s.onEdgesChange)
  const onConnect = useJamStore((s) => s.onConnect)
  const addAtom = useJamStore((s) => s.addAtom)
  const addBundle = useJamStore((s) => s.addBundle)
  const addNote = useJamStore((s) => s.addNote)
  const addComment = useJamStore((s) => s.addComment)
  const addImage = useJamStore((s) => s.addImage)
  const dropTemplate = useJamStore((s) => s.dropTemplate)
  const notesVisible = useJamStore((s) => s.notesVisible)
  const helpers = useJamStore((s) => s.helpers)
  const zoom = useJamStore((s) => s.zoom)
  const setZoom = useJamStore((s) => s.setZoom)
  const clearHelpers = useJamStore((s) => s.clearHelpers)
  const selectOnly = useJamStore((s) => s.selectOnly)
  const copySelected = useJamStore((s) => s.copySelected)
  const paste = useJamStore((s) => s.paste)
  const toggleInspector = useJamStore((s) => s.toggleInspector)
  const rf = useReactFlow()

  const [menu, setMenu] = useState<{ x: number; y: number; flow: XY } | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const openMenu = useCallback(
    (clientX: number, clientY: number) => {
      setMenu({ x: clientX, y: clientY, flow: rf.screenToFlowPosition({ x: clientX, y: clientY }) })
    },
    [rf]
  )

  // コピー＆ペースト（テキスト編集中は無効化＝ネイティブのコピペを優先）
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      // F2: インスペクタ開閉（複数選択中は無効）
      if (e.key === 'F2') {
        const selCount = useJamStore.getState().nodes.filter((n) => n.selected).length
        if (selCount > 1) return
        e.preventDefault()
        closeMenu() // 右クリックメニューのバックドロップが残って入力を覆うのを防ぐ
        toggleInspector()
        return
      }
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'c') {
        e.preventDefault()
        copySelected()
      } else if (k === 'v') {
        e.preventDefault()
        paste()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [copySelected, paste, toggleInspector, closeMenu])

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const payload = e.dataTransfer.getData('application/jam')
      if (!payload) {
        // OSから画像ファイルをドロップ
        const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
        if (file) {
          const src = await readFileAsDataURL(file)
          const dim = await loadImageDims(src)
          const fit = fitSize(dim.w, dim.h)
          addImage(src, pos, fit.w, fit.h)
        }
        return
      }
      const sep = payload.indexOf(':')
      const kind = payload.slice(0, sep)
      const id = payload.slice(sep + 1)
      if (kind === 'atom') addAtom(id as PartType, pos)
      else if (kind === 'icon') addAtom('icon', pos, { icon: id })
      else if (kind === 'bundle') addBundle(id, pos)
      else if (kind === 'note') addNote(pos)
      else if (kind === 'comment') addComment(pos)
      else if (kind === 'mytpl') void dropTemplate(id, pos)
    },
    [rf, addAtom, addBundle, addNote, addComment, dropTemplate, addImage]
  )

  // 単一の部品/グループの右クリック
  const onNodeContextMenu = useCallback(
    (e: MouseEvent, node: JamNode) => {
      e.preventDefault()
      if (!node.selected) selectOnly(node.id)
      openMenu(e.clientX, e.clientY)
    },
    [selectOnly, openMenu]
  )

  // 複数選択の「選択矩形」上での右クリック（onNode/onPaneでは拾えないため必須）。選択は維持。
  const onSelectionContextMenu = useCallback(
    (e: MouseEvent, _nodes: JamNode[]) => {
      e.preventDefault()
      openMenu(e.clientX, e.clientY)
    },
    [openMenu]
  )

  // 空白/フレーム本体での右クリック。既存の選択は壊さず、常にメニューを出す。
  // 何も選択していない時だけ、カーソル下のフレームを選択（フレーム操作用）。
  const onPaneContextMenu = useCallback(
    (e: MinimalMouse) => {
      e.preventDefault()
      const anySelected = nodes.some((n) => n.selected)
      if (!anySelected) {
        const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        const screen = findScreenAt(nodes, pos)
        if (screen) selectOnly(screen.id)
      }
      openMenu(e.clientX, e.clientY)
    },
    [rf, nodes, selectOnly, openMenu]
  )

  // メモ非表示時は note/comment を隠す
  const shownNodes = notesVisible
    ? nodes
    : nodes.map((n) => (n.type === 'note' || n.type === 'comment' ? { ...n, hidden: true } : n))
  // 注釈線もメモトグルで一緒に出し入れ
  const shownEdges = notesVisible ? edges : edges.map((e) => ({ ...e, hidden: true }))

  return (
    <div className="relative h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow<JamNode, JamEdge>
        nodes={shownNodes}
        edges={shownEdges}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeContextMenu={onNodeContextMenu}
        onSelectionContextMenu={onSelectionContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={closeMenu}
        onMoveStart={closeMenu}
        onMoveEnd={(_e: unknown, vp: { zoom: number }) => setZoom(vp.zoom)}
        onNodeDragStop={() => clearHelpers()}
        nodeTypes={nodeTypes}
        elevateNodesOnSelect={false}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 40, y: 40, zoom: 0.5 }}
        deleteKeyCode={['Delete', 'Backspace']}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
        {helpers && (
          <ViewportPortal>
            {helpers.vx !== undefined && (
              <div
                style={{
                  position: 'absolute',
                  left: helpers.vx,
                  top: -100000,
                  width: 1.5 / (zoom || 1),
                  height: 200000,
                  background: '#ec4899',
                  pointerEvents: 'none'
                }}
              />
            )}
            {helpers.hy !== undefined && (
              <div
                style={{
                  position: 'absolute',
                  top: helpers.hy,
                  left: -100000,
                  height: 1.5 / (zoom || 1),
                  width: 200000,
                  background: '#ec4899',
                  pointerEvents: 'none'
                }}
              />
            )}
          </ViewportPortal>
        )}
      </ReactFlow>
      {menu && <ContextMenu x={menu.x} y={menu.y} pastePos={menu.flow} onClose={closeMenu} />}
    </div>
  )
}
