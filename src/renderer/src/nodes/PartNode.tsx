import { memo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { NodeResizer, NodeResizeControl, type NodeProps } from '@xyflow/react'
import type { PartNode as PartNodeType, PartData } from '../types'
import { resizePolicy, ATOMS } from '../parts'
import { renderPart } from '../renderPart'
import { useShiftKey } from '../useShiftKey'
import { useJamStore } from '../store'
import { loadImageDims, fitSize } from '../imageUtil'
import NodeHandles from './NodeHandles'

const widthHandle = (
  <div style={{ width: 6, height: 18, background: '#374151', borderRadius: 3, cursor: 'ew-resize' }} />
)

function PartNodeImpl({ id, data, selected }: NodeProps<PartNodeType>) {
  const shift = useShiftKey()
  const updatePartData = useJamStore((s) => s.updatePartData)
  const setInspectorOpen = useJamStore((s) => s.setInspectorOpen)
  const selectOnly = useJamStore((s) => s.selectOnly)
  const openTableEditor = useJamStore((s) => s.openTableEditor)
  const setImageSrc = useJamStore((s) => s.setImageSrc)
  const [editing, setEditing] = useState(false)
  const { policy, minW, minH } = resizePolicy(data.partType)

  const fields = ATOMS[data.partType].fields
  // テキスト/複数行がちょうど1つの部品だけインライン編集。それ以外（複数項目/リスト）はインスペクタへ。
  const editFields = fields.filter((f) => f.kind === 'text' || f.kind === 'multiline')
  const inlineField = editFields.length === 1 ? editFields[0] : null
  const inlineKey = inlineField?.key ?? null
  const inlineMultiline = inlineField?.kind === 'multiline'
  const current = inlineKey ? ((data[inlineKey] as string | undefined) ?? '') : ''

  const replaceImage = async (): Promise<void> => {
    if (!window.jam?.pickImage) return
    const src = await window.jam.pickImage()
    if (!src) return
    const dim = await loadImageDims(src)
    const fit = fitSize(dim.w, dim.h)
    setImageSrc(id, src, fit.w, fit.h)
  }
  const onDoubleClick = (): void => {
    if (data.partType === 'table') openTableEditor(id)
    else if (data.partType === 'image') void replaceImage()
    else if (inlineKey) setEditing(true)
    else {
      selectOnly(id)
      setInspectorOpen(true)
    }
  }
  const commit = (v: string): void => {
    if (inlineKey) updatePartData(id, { [inlineKey]: v } as Partial<PartData>)
    setEditing(false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    e.stopPropagation()
    // IME変換中(日本語入力の確定Enter等)はキー処理しない
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(e.currentTarget.value)
    } else if (e.key === 'Escape') {
      setEditing(false)
    }
  }
  // 複数行(textarea): Enterは改行。確定は blur、取消は Esc。
  const onKeyDownArea = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    e.stopPropagation()
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Escape') setEditing(false)
  }

  const themeVars: Record<string, string> = {}
  if (data.colorBg) themeVars['--jam-bg'] = data.colorBg
  if (data.colorInk) themeVars['--jam-ink'] = data.colorInk
  if (data.colorText) themeVars['--jam-text'] = data.colorText

  return (
    <div className="h-full w-full" style={themeVars as CSSProperties} onDoubleClick={onDoubleClick}>
      <NodeHandles />
      {selected && policy === 'width' && (
        <>
          <NodeResizeControl
            position="left"
            minWidth={minW}
            minHeight={minH}
            style={{ background: 'transparent', border: 'none' }}
          >
            {widthHandle}
          </NodeResizeControl>
          <NodeResizeControl
            position="right"
            minWidth={minW}
            minHeight={minH}
            style={{ background: 'transparent', border: 'none' }}
          >
            {widthHandle}
          </NodeResizeControl>
        </>
      )}
      {selected && (policy === 'free' || policy === 'aspect') && (
        <NodeResizer
          minWidth={minW}
          minHeight={minH}
          isVisible
          keepAspectRatio={policy === 'aspect' ? !shift : shift}
        />
      )}
      {editing && inlineKey ? (
        inlineMultiline ? (
          <textarea
            autoFocus
            defaultValue={current}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={onKeyDownArea}
            className="nodrag nopan h-full w-full resize-none rounded border border-jam-ink px-2 py-1 font-hand text-sm text-jam-ink outline-none"
          />
        ) : (
          <input
            autoFocus
            defaultValue={current}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={onKeyDown}
            className="nodrag nopan h-full w-full rounded border border-jam-ink px-2 font-hand text-sm text-jam-ink outline-none"
          />
        )
      ) : (
        renderPart(data)
      )}
    </div>
  )
}

export default memo(PartNodeImpl)
