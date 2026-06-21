import { Handle, Position } from '@xyflow/react'
import type { CSSProperties } from 'react'

// 注釈線の接続点（不可視・非ドラッグ）。エッジは別途フローティングで境界に接続するため位置は使わない。
const hidden: CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  border: 'none',
  background: 'transparent',
  pointerEvents: 'none'
}

export default function NodeHandles() {
  return (
    <>
      <Handle id="s" type="source" position={Position.Top} style={hidden} isConnectable={false} />
      <Handle id="t" type="target" position={Position.Top} style={hidden} isConnectable={false} />
    </>
  )
}
