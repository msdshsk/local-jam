import { useLayoutEffect, useRef, useState } from 'react'
import { useJamStore } from '../store'
import type { XY } from '../geometry'

interface Props {
  x: number
  y: number
  pastePos: XY
  onClose: () => void
}

export default function ContextMenu({ x, y, pastePos, onClose }: Props) {
  const nodes = useJamStore((s) => s.nodes)
  const clipboardLen = useJamStore((s) => s.clipboard.length)
  const groupSelected = useJamStore((s) => s.groupSelected)
  const ungroupSelected = useJamStore((s) => s.ungroupSelected)
  const bringToFront = useJamStore((s) => s.bringToFrontSelected)
  const sendToBack = useJamStore((s) => s.sendToBackSelected)
  const scaleSelected = useJamStore((s) => s.scaleSelected)
  const deleteSelected = useJamStore((s) => s.deleteSelected)
  const copySelected = useJamStore((s) => s.copySelected)
  const paste = useJamStore((s) => s.paste)
  const alignSelected = useJamStore((s) => s.alignSelected)
  const connectSelected = useJamStore((s) => s.connectSelected)
  const openTemplateNamer = useJamStore((s) => s.openTemplateNamer)
  const setInspectorOpen = useJamStore((s) => s.setInspectorOpen)

  const [alignSub, setAlignSub] = useState(false)

  // 画面端でメニューが切れない（WebViewは画面外にはみ出せずoverflow:hiddenされる）よう、
  // 実寸を測ってウィンドウ内にクランプ。サブメニューは右に出せなければ左へ反転。
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })
  const [subLeft, setSubLeft] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const m = 8
    let left = x
    let top = y
    if (left + r.width > window.innerWidth - m) left = Math.max(m, window.innerWidth - r.width - m)
    if (top + r.height > window.innerHeight - m) top = Math.max(m, window.innerHeight - r.height - m)
    setPos({ left, top })
    setSubLeft(left + r.width + 160 > window.innerWidth)
  }, [x, y])

  const selected = nodes.filter((n) => n.selected)
  const partCount = selected.filter((n) => n.type === 'part').length
  const alignable = selected.filter((n) => n.type !== 'screen').length
  const canGroup = partCount >= 2
  const canUngroup = selected.some((n) => n.type === 'jgroup')
  const canPart = partCount >= 1
  const canZ = selected.length >= 1
  const has = selected.length >= 1
  const canPaste = clipboardLen > 0
  const canAlign = alignable >= 2
  const canDist = alignable >= 3
  const canInspect = selected.length === 1
  const canConnect = selected.length === 2
  const canTemplate = selected.length >= 1

  const run = (fn: () => void) => (): void => {
    fn()
    onClose()
  }

  const item =
    'block w-full px-3 py-1.5 text-left font-hand text-sm text-jam-ink hover:bg-gray-100 disabled:text-jam-line disabled:hover:bg-transparent'

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <div
        ref={ref}
        className="fixed z-50 min-w-[180px] rounded-md border border-jam-line bg-white py-1 shadow-lg"
        style={{ left: pos.left, top: pos.top }}
      >
        <button className={item} disabled={!has} onClick={run(copySelected)}>
          コピー <span className="text-jam-line">Ctrl+C</span>
        </button>
        <button className={item} disabled={!canPaste} onClick={run(() => paste(pastePos))}>
          ペースト <span className="text-jam-line">Ctrl+V</span>
        </button>
        <hr className="my-1 border-jam-line/50" />
        <button className={item} disabled={!canGroup} onClick={run(groupSelected)}>
          グループ化
        </button>
        <button className={item} disabled={!canUngroup} onClick={run(ungroupSelected)}>
          グループ解除
        </button>
        <button className={item} disabled={!canConnect} onClick={run(connectSelected)}>
          線でつなぐ
        </button>
        <button
          className={item}
          disabled={!canTemplate}
          onClick={() => {
            openTemplateNamer()
            onClose()
          }}
        >
          テンプレート化…
        </button>
        <hr className="my-1 border-jam-line/50" />

        {/* 整列（親）→ サブメニュー */}
        <div
          className="relative"
          onMouseEnter={() => setAlignSub(true)}
          onMouseLeave={() => setAlignSub(false)}
        >
          <button className={item + ' flex items-center justify-between'} disabled={!canAlign}>
            <span>整列</span>
            <span className="text-jam-line">▸</span>
          </button>
          {alignSub && canAlign && (
            <div
              className={
                'absolute top-0 z-50 min-w-[150px] rounded-md border border-jam-line bg-white py-1 shadow-lg ' +
                (subLeft ? 'right-full -mr-1' : 'left-full -ml-1')
              }
            >
              <button className={item} onClick={run(() => alignSelected('left'))}>
                左揃え
              </button>
              <button className={item} onClick={run(() => alignSelected('right'))}>
                右揃え
              </button>
              <button className={item} onClick={run(() => alignSelected('top'))}>
                上揃え
              </button>
              <button className={item} onClick={run(() => alignSelected('bottom'))}>
                下揃え
              </button>
              <hr className="my-1 border-jam-line/50" />
              <button className={item} disabled={!canDist} onClick={run(() => alignSelected('distH'))}>
                水平等間隔
              </button>
              <button className={item} disabled={!canDist} onClick={run(() => alignSelected('distV'))}>
                垂直等間隔
              </button>
            </div>
          )}
        </div>

        <button className={item} disabled={!canZ} onClick={run(bringToFront)}>
          最前面へ
        </button>
        <button className={item} disabled={!canZ} onClick={run(sendToBack)}>
          最背面へ
        </button>
        <hr className="my-1 border-jam-line/50" />
        <button className={item} disabled={!canPart} onClick={run(() => scaleSelected(1.1))}>
          大きく
        </button>
        <button className={item} disabled={!canPart} onClick={run(() => scaleSelected(1 / 1.1))}>
          小さく
        </button>
        <hr className="my-1 border-jam-line/50" />
        <button className={item} disabled={!canInspect} onClick={run(() => setInspectorOpen(true))}>
          インスペクタを開く <span className="text-jam-line">F2</span>
        </button>
        <hr className="my-1 border-jam-line/50" />
        <button className={item} disabled={!has} onClick={run(deleteSelected)}>
          削除
        </button>
      </div>
    </>
  )
}
