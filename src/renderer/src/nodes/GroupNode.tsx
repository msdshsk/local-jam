import { memo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { GroupNode as GroupNodeType, GroupChild, PartData } from '../types'
import { renderPart, editableField } from '../renderPart'
import { useJamStore } from '../store'
import NodeHandles from './NodeHandles'

// グループ＝中身を内包する1ノード。枠は非表示（選択時のみ薄いリング）。
// どこを掴んでも一体で動く。子をダブルクリックでテキスト編集。グループ化/解除は右クリックから。
function ChildView({ groupId, c }: { groupId: string; c: GroupChild }) {
  const updateGroupChild = useJamStore((s) => s.updateGroupChild)
  const [editing, setEditing] = useState(false)
  const field = editableField(c.data.partType)
  const current = field ? ((c.data[field] as string | undefined) ?? '') : ''

  const commit = (v: string): void => {
    if (field) {
      updateGroupChild(groupId, c.cid, { [field]: v } as Partial<PartData>)
    }
    setEditing(false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    e.stopPropagation()
    if (e.nativeEvent.isComposing) return // IME変換中は無視
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(e.currentTarget.value)
    } else if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  const themeVars: Record<string, string> = {}
  if (c.data.colorBg) themeVars['--jam-bg'] = c.data.colorBg
  if (c.data.colorInk) themeVars['--jam-ink'] = c.data.colorInk
  if (c.data.colorText) themeVars['--jam-text'] = c.data.colorText

  return (
    <div
      style={
        { position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, ...themeVars } as CSSProperties
      }
      onDoubleClick={(e) => {
        if (field) {
          e.stopPropagation()
          setEditing(true)
        }
      }}
    >
      {editing && field ? (
        <input
          autoFocus
          defaultValue={current}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={onKeyDown}
          className="nodrag nopan h-full w-full rounded border border-jam-ink px-2 font-hand text-sm text-jam-ink outline-none"
        />
      ) : (
        renderPart(c.data)
      )}
    </div>
  )
}

function GroupNodeImpl({ id, data, selected }: NodeProps<GroupNodeType>) {
  return (
    <div
      className={
        'relative h-full w-full ' +
        (selected ? 'rounded outline outline-1 outline-jam-ink/40' : '')
      }
    >
      <NodeHandles />
      {data.children.map((c) => (
        <ChildView key={c.cid} groupId={id} c={c} />
      ))}
    </div>
  )
}

export default memo(GroupNodeImpl)
