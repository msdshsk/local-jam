import { memo, useState, type KeyboardEvent } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import type { NoteNode as NoteNodeType } from '../types'
import { useJamStore } from '../store'
import NodeHandles from './NodeHandles'

// 付箋メモ: 黄色系の付箋。ダブルクリックで本文編集、自由リサイズ。
function NoteNodeImpl({ id, data, selected }: NodeProps<NoteNodeType>) {
  const update = useJamStore((s) => s.updateNoteText)
  const [editing, setEditing] = useState(false)

  return (
    <div
      className="h-full w-full rounded-sm border border-yellow-300 bg-yellow-100/90 p-2 shadow-sm"
      onDoubleClick={() => setEditing(true)}
    >
      <NodeHandles />
      <NodeResizer minWidth={120} minHeight={60} isVisible={!!selected} />
      {editing ? (
        <textarea
          autoFocus
          defaultValue={data.text}
          onBlur={(e) => {
            update(id, e.target.value)
            setEditing(false)
          }}
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            e.stopPropagation()
            if (e.nativeEvent.isComposing) return // IME変換中のEscは変換取消なので閉じない
            if (e.key === 'Escape') setEditing(false)
          }}
          className="nodrag nopan h-full w-full resize-none bg-transparent font-hand text-sm text-jam-ink outline-none"
        />
      ) : (
        <div className="h-full w-full overflow-hidden whitespace-pre-wrap font-hand text-sm text-jam-ink">
          {data.text || 'メモ'}
        </div>
      )}
    </div>
  )
}

export default memo(NoteNodeImpl)
