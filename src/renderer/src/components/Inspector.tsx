import { useEffect, useState } from 'react'
import { useJamStore } from '../store'
import { ATOMS } from '../parts'
import { ICON_NAMES, ICONS, IconGlyph } from '../icons'
import type { PartData, PartNode } from '../types'

function TextField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-jam-muted">{label}</span>
      <input
        className="rounded border border-jam-line bg-white px-2 py-1 font-hand text-sm text-jam-ink outline-none focus:border-jam-ink"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function ListField({
  label,
  value,
  onChange
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-jam-muted">{label}</span>
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            className="min-w-0 flex-1 rounded border border-jam-line bg-white px-2 py-1 font-hand text-sm text-jam-ink outline-none focus:border-jam-ink"
            value={item}
            onChange={(e) => {
              const a = [...value]
              a[i] = e.target.value
              onChange(a)
            }}
          />
          <button
            type="button"
            className="px-1 text-jam-muted hover:text-red-600"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            title="削除"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="self-start rounded border border-dashed border-jam-line px-2 py-0.5 text-xs text-jam-muted hover:bg-gray-100"
        onClick={() => onChange([...value, '項目'])}
      >
        ＋ 追加
      </button>
    </div>
  )
}

// 数値入力。手入力中は空欄を許可し（0へ即スナップしない）、有効な数値のみ反映。
function NumberField({
  label,
  value,
  onChange
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText(String(value))
  }, [value])
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs text-jam-muted">{label}</span>
      <input
        type="number"
        value={text}
        onChange={(e) => {
          const raw = e.target.value
          setText(raw)
          if (raw === '') return
          const n = Number(raw)
          if (!Number.isNaN(n)) onChange(n)
        }}
        onBlur={() => {
          if (text === '' || Number.isNaN(Number(text))) setText(String(value))
        }}
        className="w-16 rounded border border-jam-line px-1 py-0.5 text-right text-sm text-jam-ink outline-none focus:border-jam-ink"
      />
    </label>
  )
}

// 複数行テキスト
function MultilineField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-jam-muted">{label}</span>
      <textarea
        className="min-h-[64px] resize-y rounded border border-jam-line bg-white px-2 py-1 font-hand text-sm text-jam-ink outline-none focus:border-jam-ink"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

// アイコンの「絵」を見て選ぶリスト（名前の手入力不要）
function IconListField({
  label,
  value,
  onChange
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [pick, setPick] = useState(false)
  const arr = value ?? []
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-jam-muted">{label}</span>
      <div className="flex flex-wrap gap-1">
        {arr.map((name, i) => (
          <button
            key={i}
            type="button"
            title={(ICONS[name]?.label ?? name) + '（クリックで削除）'}
            onClick={() => onChange(arr.filter((_, j) => j !== i))}
            className="flex h-7 w-7 items-center justify-center rounded border border-jam-line bg-white text-jam-ink hover:border-red-400"
          >
            <span className="h-4 w-4">
              <IconGlyph name={name} />
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPick((o) => !o)}
          title="アイコンを追加"
          className="flex h-7 w-7 items-center justify-center rounded border border-dashed border-jam-line text-jam-muted hover:bg-gray-100"
        >
          ＋
        </button>
      </div>
      {pick && (
        <div className="mt-1 grid max-h-40 grid-cols-6 gap-1 overflow-y-auto rounded border border-jam-line bg-gray-50 p-1">
          {ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              title={ICONS[name].label}
              onClick={() => onChange([...arr, name])}
              className="flex aspect-square items-center justify-center rounded text-jam-ink hover:bg-gray-200"
            >
              <span className="h-4 w-4">
                <IconGlyph name={name} />
              </span>
            </button>
          ))}
        </div>
      )}
      <span className="text-[10px] leading-tight text-jam-muted">絵をクリックで削除 / ＋で一覧から追加</span>
    </div>
  )
}

function ColorRow({
  label,
  value,
  fallback,
  onChange,
  onReset
}: {
  label: string
  value?: string
  fallback: string
  onChange: (v: string) => void
  onReset: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-jam-muted">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value ?? fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-9 cursor-pointer rounded border border-jam-line bg-white p-0.5"
        />
        <button
          type="button"
          className={'px-1 text-xs ' + (value ? 'text-jam-muted hover:text-jam-ink' : 'invisible')}
          onClick={onReset}
          title="既定に戻す"
        >
          ⟲
        </button>
      </div>
    </div>
  )
}

function TableInspector({
  node,
  updateTable,
  openEditor
}: {
  node: PartNode
  updateTable: (id: string, patch: { columns?: string[]; rows?: number; cells?: string[][] }) => void
  openEditor: (id: string) => void
}) {
  const cols = node.data.columns ?? []
  const rows = node.data.rows ?? 0
  const step = 'rounded border border-jam-line px-2 text-sm text-jam-ink hover:bg-gray-100'
  return (
    <>
      <ListField label="列見出し" value={cols} onChange={(v) => updateTable(node.id, { columns: v })} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-jam-muted">行数</span>
        <div className="flex items-center gap-1">
          <button type="button" className={step} onClick={() => updateTable(node.id, { rows: Math.max(0, rows - 1) })}>
            －
          </button>
          <span className="w-6 text-center text-sm text-jam-ink">{rows}</span>
          <button type="button" className={step} onClick={() => updateTable(node.id, { rows: rows + 1 })}>
            ＋
          </button>
        </div>
      </div>
      <button
        type="button"
        className="rounded border border-jam-ink bg-gray-100 px-2 py-1 font-hand text-sm text-jam-ink hover:bg-gray-200"
        onClick={() => openEditor(node.id)}
      >
        セルを編集…
      </button>
    </>
  )
}

function ThemeSection({
  node,
  update
}: {
  node: PartNode
  update: (id: string, patch: Partial<PartData>) => void
}) {
  const d = node.data
  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-jam-line/60 pt-2">
      <span className="text-xs font-bold text-jam-ink">テーマ</span>
      <ColorRow label="背景" value={d.colorBg} fallback="#ffffff" onChange={(v) => update(node.id, { colorBg: v })} onReset={() => update(node.id, { colorBg: undefined })} />
      <ColorRow label="濃い色" value={d.colorInk} fallback="#374151" onChange={(v) => update(node.id, { colorInk: v })} onReset={() => update(node.id, { colorInk: undefined })} />
      <ColorRow label="テキスト" value={d.colorText} fallback="#374151" onChange={(v) => update(node.id, { colorText: v })} onReset={() => update(node.id, { colorText: undefined })} />
    </div>
  )
}

function PartFields({
  node,
  update
}: {
  node: PartNode
  update: (id: string, patch: Partial<PartData>) => void
}) {
  const fields = ATOMS[node.data.partType].fields
  if (fields.length === 0) {
    return <p className="text-xs text-jam-muted">この部品に編集項目はありません。</p>
  }
  return (
    <>
      {fields.map((f) => {
        if (f.kind === 'text' || f.kind === 'csv') {
          return (
            <TextField
              key={f.key}
              label={f.label}
              value={(node.data[f.key] as string | undefined) ?? ''}
              onChange={(v) => update(node.id, { [f.key]: v } as Partial<PartData>)}
            />
          )
        }
        if (f.kind === 'multiline') {
          return (
            <MultilineField
              key={f.key}
              label={f.label}
              value={(node.data[f.key] as string | undefined) ?? ''}
              onChange={(v) => update(node.id, { [f.key]: v } as Partial<PartData>)}
            />
          )
        }
        if (f.kind === 'iconlist') {
          return (
            <IconListField
              key={f.key}
              label={f.label}
              value={(node.data[f.key] as string[] | undefined) ?? []}
              onChange={(v) => update(node.id, { [f.key]: v } as Partial<PartData>)}
            />
          )
        }
        if (f.kind === 'list') {
          return (
            <ListField
              key={f.key}
              label={f.label}
              value={(node.data[f.key] as string[] | undefined) ?? []}
              onChange={(v) => update(node.id, { [f.key]: v } as Partial<PartData>)}
            />
          )
        }
        if (f.kind === 'bool') {
          return (
            <label key={f.key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-jam-muted">{f.label}</span>
              <input
                type="checkbox"
                checked={!!node.data[f.key]}
                onChange={(e) => update(node.id, { [f.key]: e.target.checked } as Partial<PartData>)}
              />
            </label>
          )
        }
        if (f.kind === 'choice') {
          return (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-xs text-jam-muted">{f.label}</span>
              <select
                className="rounded border border-jam-line bg-white px-2 py-1 font-hand text-sm text-jam-ink outline-none focus:border-jam-ink"
                value={(node.data[f.key] as string | undefined) ?? f.choices?.[0]?.value ?? ''}
                onChange={(e) => update(node.id, { [f.key]: e.target.value } as Partial<PartData>)}
              >
                {(f.choices ?? []).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )
        }
        return (
          <NumberField
            key={f.key}
            label={f.label}
            value={(node.data[f.key] as number | undefined) ?? 0}
            onChange={(v) => update(node.id, { [f.key]: v } as Partial<PartData>)}
          />
        )
      })}
    </>
  )
}

export default function Inspector() {
  const nodes = useJamStore((s) => s.nodes)
  const setInspectorOpen = useJamStore((s) => s.setInspectorOpen)
  const updatePartData = useJamStore((s) => s.updatePartData)
  const updateScreenData = useJamStore((s) => s.updateScreenData)
  const updateTable = useJamStore((s) => s.updateTable)
  const openTableEditor = useJamStore((s) => s.openTableEditor)

  const selected = nodes.filter((n) => n.selected)
  const node = selected.length === 1 ? selected[0] : null

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l border-jam-line bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-jam-muted">インスペクタ</h2>
        <button
          type="button"
          className="px-1 text-jam-muted hover:text-jam-ink"
          onClick={() => setInspectorOpen(false)}
          title="閉じる (F2)"
        >
          ×
        </button>
      </div>

      {!node && (
        <p className="text-xs leading-relaxed text-jam-muted">
          部品を1つ選択してください。
          <br />
          （複数選択中は表示できません）
        </p>
      )}

      {node && node.type === 'screen' && (
        <>
          <p className="text-xs font-bold text-jam-ink">空フレーム（分類ゾーン）</p>
          <TextField
            label="区分名"
            value={node.data.title}
            onChange={(v) => updateScreenData(node.id, { title: v })}
          />
          <ColorRow
            label="背景色"
            value={node.data.colorBg}
            fallback="#ffffff"
            onChange={(v) => updateScreenData(node.id, { colorBg: v })}
            onReset={() => updateScreenData(node.id, { colorBg: undefined })}
          />
          <ColorRow
            label="文字色"
            value={node.data.colorText}
            fallback="#374151"
            onChange={(v) => updateScreenData(node.id, { colorText: v })}
            onReset={() => updateScreenData(node.id, { colorText: undefined })}
          />
        </>
      )}

      {node && node.type === 'jgroup' && (
        <p className="text-xs leading-relaxed text-jam-muted">
          グループです。解除（右クリック）して各部品を選ぶと編集できます。
        </p>
      )}

      {node && (node.type === 'note' || node.type === 'comment') && (
        <p className="text-xs leading-relaxed text-jam-muted">
          {node.type === 'note' ? '付箋メモ' : 'コメント'}です。ダブルクリックで本文を編集できます。
        </p>
      )}

      {node && node.type === 'part' && (
        <>
          <p className="text-xs font-bold text-jam-ink">{ATOMS[node.data.partType].label}</p>
          {node.data.partType === 'table' ? (
            <TableInspector node={node} updateTable={updateTable} openEditor={openTableEditor} />
          ) : (
            <PartFields node={node} update={updatePartData} />
          )}
          <ThemeSection node={node} update={updatePartData} />
        </>
      )}
    </aside>
  )
}
