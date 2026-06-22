import { useEffect, useState, type DragEvent, type ReactNode } from 'react'
import { ATOMS, CATEGORY_ORDER, CATEGORY_LABEL, type PartCategory } from '../parts'
import { BUNDLES } from '../bundles'
import { ICON_NAMES, ICONS, IconGlyph } from '../icons'
import { useJamStore } from '../store'
import type { PartType } from '../types'

function onDragStart(e: DragEvent<HTMLDivElement>, payload: string): void {
  e.dataTransfer.setData('application/jam', payload)
  e.dataTransfer.effectAllowed = 'move'
}

const partKeys = Object.keys(ATOMS) as PartType[]
const byCategory = {} as Record<PartCategory, PartType[]>
for (const c of CATEGORY_ORDER) byCategory[c] = []
// アイコンは専用グリッドで出すので通常のカテゴリ一覧からは除外
for (const k of partKeys) {
  if (k === 'icon') continue
  byCategory[ATOMS[k].category].push(k)
}

const tile =
  'cursor-grab rounded border border-jam-line bg-white px-2 py-1.5 font-hand text-sm text-jam-ink active:cursor-grabbing'

// 折りたたみ可能なセクション
function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between text-xs font-bold uppercase tracking-wide text-jam-muted hover:text-jam-ink"
      >
        <span>{title}</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="flex flex-col gap-1.5">{children}</div>}
    </section>
  )
}

export default function Palette() {
  const myTemplates = useJamStore((s) => s.myTemplates)
  const refreshTemplates = useJamStore((s) => s.refreshTemplates)
  const deleteTemplate = useJamStore((s) => s.deleteTemplate)
  const exportTemplate = useJamStore((s) => s.exportTemplate)
  const importTemplate = useJamStore((s) => s.importTemplate)

  useEffect(() => {
    refreshTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-r border-jam-line bg-gray-50 p-3">
      <Section title="マイテンプレート">
        <button
          type="button"
          onClick={() => importTemplate()}
          title=".ljat ファイルを取り込み"
          className="rounded border border-dashed border-jam-line bg-white px-2 py-1 text-xs text-jam-muted hover:bg-gray-100 hover:text-jam-ink"
        >
          ＋ 取り込み（.ljat）
        </button>
        {myTemplates.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-jam-muted">
            複数選択 → 右クリック「テンプレート化」で、ここに追加されます。配布は ⬇ で書き出し。
          </p>
        ) : (
          myTemplates.map((t) => (
            <div
              key={t.id}
              draggable
              onDragStart={(e) => onDragStart(e, `mytpl:${t.id}`)}
              className="flex cursor-grab items-center gap-1 rounded border border-dashed border-jam-line bg-white px-2 py-1.5 font-hand text-sm text-jam-ink active:cursor-grabbing"
            >
              <span className="min-w-0 flex-1 truncate">{t.name}</span>
              <button
                type="button"
                title="書き出し（.ljat）"
                onClick={(e) => {
                  e.stopPropagation()
                  exportTemplate(t.id)
                }}
                className="shrink-0 px-1 text-jam-muted hover:text-jam-ink"
              >
                ⬇
              </button>
              <button
                type="button"
                title="削除"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteTemplate(t.id)
                }}
                className="shrink-0 px-1 text-jam-muted hover:text-red-600"
              >
                ×
              </button>
            </div>
          ))
        )}
      </Section>

      <Section title="テンプレ / バンドル">
        {BUNDLES.map((b) => (
          <div
            key={b.id}
            draggable
            onDragStart={(e) => onDragStart(e, `bundle:${b.id}`)}
            className="cursor-grab rounded border border-dashed border-jam-line bg-white px-2 py-1.5 font-hand text-sm text-jam-ink active:cursor-grabbing"
          >
            {b.name}
          </div>
        ))}
      </Section>

      {CATEGORY_ORDER.map((cat) => (
        <Section key={cat} title={CATEGORY_LABEL[cat]}>
          {byCategory[cat].map((k) => (
            <div key={k} draggable onDragStart={(e) => onDragStart(e, `atom:${k}`)} className={tile}>
              {ATOMS[k].label}
            </div>
          ))}
        </Section>
      ))}

      <Section title="アイコン">
        <div className="grid grid-cols-5 gap-1">
          {ICON_NAMES.map((name) => (
            <div
              key={name}
              draggable
              onDragStart={(e) => onDragStart(e, `icon:${name}`)}
              title={ICONS[name].label}
              className="flex aspect-square cursor-grab items-center justify-center rounded border border-jam-line bg-white p-1.5 text-jam-ink hover:bg-gray-100 active:cursor-grabbing"
            >
              <IconGlyph name={name} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="メモ・注釈">
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'note:sticky')}
          className="cursor-grab rounded border border-yellow-300 bg-yellow-100 px-2 py-1.5 font-hand text-sm text-jam-ink active:cursor-grabbing"
        >
          付箋メモ
        </div>
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'comment:pin')}
          className="cursor-grab rounded border border-amber-300 bg-amber-100 px-2 py-1.5 font-hand text-sm text-jam-ink active:cursor-grabbing"
        >
          コメント
        </div>
      </Section>

      <p className="mt-auto text-[11px] leading-relaxed text-jam-muted">
        ドラッグ＆ドロップで配置。フレーム上に落とすと吸着（子）に。複数選択は Shift+クリック/ドラッグ。
      </p>
    </aside>
  )
}
