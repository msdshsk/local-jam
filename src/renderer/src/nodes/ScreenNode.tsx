import { memo } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import type { ScreenNode as ScreenNodeType } from '../types'
import NodeHandles from './NodeHandles'

// 空フレーム＝「分類ゾーン＋子の入れ物」。本体はポインタ透過（上でパン/子を操作可）。
// タイトル(=ドラッグ取っ手)とリサイズ枠だけ操作可。背景色はインスペクタで設定（既定は半透明白＝下のドットが透ける）。
function ScreenNodeImpl({ data, selected }: NodeProps<ScreenNodeType>) {
  return (
    <div
      className="h-full w-full rounded-lg border t-line"
      style={{ backgroundColor: data.colorBg || 'rgba(255,255,255,0.6)' }}
    >
      <NodeHandles />
      <NodeResizer
        minWidth={240}
        minHeight={160}
        isVisible={!!selected}
        handleStyle={{ pointerEvents: 'auto' }}
        lineStyle={{ pointerEvents: 'auto' }}
      />
      <div
        className={
          'jam-frame-title cursor-move select-none rounded-t-lg border-b border-dashed t-line px-3 py-1 font-hand text-sm ' +
          (data.colorText ? '' : 't-muted')
        }
        style={{ pointerEvents: 'auto', color: data.colorText || undefined }}
      >
        {data.title}
      </div>
    </div>
  )
}

export default memo(ScreenNodeImpl)
