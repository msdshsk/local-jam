import { useState, type KeyboardEvent } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useInternalNode,
  type EdgeProps
} from '@xyflow/react'
import { useJamStore } from '../store'

type INode = {
  measured?: { width?: number; height?: number }
  internals: { positionAbsolute: { x: number; y: number } }
}

// ノード矩形の境界とノード中心同士を結ぶ直線の交点（フローティングエッジ）
function intersection(node: INode, other: INode) {
  const w = (node.measured?.width ?? 0) / 2
  const h = (node.measured?.height ?? 0) / 2
  const x2 = node.internals.positionAbsolute.x + w
  const y2 = node.internals.positionAbsolute.y + h
  const x1 = other.internals.positionAbsolute.x + (other.measured?.width ?? 0) / 2
  const y1 = other.internals.positionAbsolute.y + (other.measured?.height ?? 0) / 2
  const xx1 = (x1 - x2) / (2 * w || 1) - (y1 - y2) / (2 * h || 1)
  const yy1 = (x1 - x2) / (2 * w || 1) + (y1 - y2) / (2 * h || 1)
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1)
  const xx3 = a * xx1
  const yy3 = a * yy1
  return { x: w * (xx3 + yy3) + x2, y: h * (-xx3 + yy3) + y2 }
}

export default function AnnotationEdge({ id, source, target, selected, data, markerEnd }: EdgeProps) {
  const s = useInternalNode(source)
  const t = useInternalNode(target)
  const update = useJamStore((st) => st.updateEdgeLabel)
  const [editing, setEditing] = useState(false)
  if (!s || !t) return null

  const sp = intersection(s as INode, t as INode)
  const tp = intersection(t as INode, s as INode)
  const [path, labelX, labelY] = getStraightPath({
    sourceX: sp.x,
    sourceY: sp.y,
    targetX: tp.x,
    targetY: tp.y
  })
  const label = (data?.label as string | undefined) ?? ''

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: '#6b7280', strokeWidth: 1.5, strokeDasharray: '6 4' }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all'
          }}
          className="nodrag nopan"
          onDoubleClick={() => setEditing(true)}
        >
          {editing ? (
            <input
              autoFocus
              defaultValue={label}
              onBlur={(e) => {
                update(id, e.target.value)
                setEditing(false)
              }}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                e.stopPropagation()
                if (e.nativeEvent.isComposing) return // IME変換中は無視
                if (e.key === 'Enter') {
                  update(id, e.currentTarget.value)
                  setEditing(false)
                } else if (e.key === 'Escape') {
                  setEditing(false)
                }
              }}
              className="rounded border border-jam-ink bg-white px-1 font-hand text-xs text-jam-ink outline-none"
            />
          ) : label ? (
            <span className="rounded border border-jam-line bg-white/90 px-1 font-hand text-xs text-jam-muted">
              {label}
            </span>
          ) : selected ? (
            <span className="rounded border border-dashed border-jam-line bg-white/80 px-1 text-[10px] text-jam-line">
              ＋ラベル
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
