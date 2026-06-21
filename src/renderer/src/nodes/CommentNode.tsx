import { memo, useState, type KeyboardEvent } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { CommentNode as CommentNodeType } from '../types'
import { useJamStore } from '../store'
import NodeHandles from './NodeHandles'

// 一口コメント: 小さなピン。クリックで吹き出し開閉、吹き出し内をダブルクリックで編集。
function CommentNodeImpl({ id, data, selected }: NodeProps<CommentNodeType>) {
  const toggle = useJamStore((s) => s.toggleComment)
  const update = useJamStore((s) => s.updateCommentText)
  const [editing, setEditing] = useState(false)

  return (
    <div className="relative">
      <NodeHandles />
      <button
        type="button"
        onClick={() => toggle(id)}
        title="クリックで開閉"
        className={
          'flex h-7 w-7 items-center justify-center rounded-full border border-amber-400 bg-amber-200 text-xs shadow ' +
          (selected ? 'ring-2 ring-amber-400' : '')
        }
      >
        💬
      </button>
      {data.open && (
        <div
          className="nopan absolute left-8 top-0 z-10 w-48 rounded border border-amber-300 bg-amber-50 p-2 shadow-lg"
          onDoubleClick={() => setEditing(true)}
        >
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
              className="nodrag nopan h-20 w-full resize-none bg-transparent font-hand text-sm text-jam-ink outline-none"
            />
          ) : (
            <div className="whitespace-pre-wrap font-hand text-sm text-jam-ink">
              {data.text || 'コメント（ダブルクリックで編集）'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(CommentNodeImpl)
