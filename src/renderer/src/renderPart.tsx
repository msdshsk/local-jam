import type { PartType } from './types'
import { IconGlyph } from './icons'
import { ATOMS } from './parts'
import { parseNums, piePaths } from './chartUtil'

// 部品の見た目（loose な PartNode とグループ内の子で共用）。色は t-* クラス（CSS変数）で制御。
export interface PartLike {
  partType: PartType
  label?: string
  placeholder?: string
  options?: string[]
  logo?: string
  nav?: string[]
  cta?: string
  checked?: boolean
  on?: boolean
  selected?: number
  src?: string
  icon?: string
  items?: string[]
  columns?: string[]
  rows?: number
  cells?: string[][]
  body?: string
  okLabel?: string
  cancelLabel?: string
  value?: string
  percent?: number
  pages?: number
  type?: string
  colorBg?: string
  itemsBottom?: string[]
}

// グループ内の子（簡易アトム）のインライン編集用。テキスト項目がちょうど1つの時その key を返す。
export function editableField(t: PartType): string | null {
  const textFields = ATOMS[t].fields.filter((f) => f.kind === 'text')
  return textFields.length === 1 ? textFields[0].key : null
}

function TableMock({ cols, rows, cells }: { cols: string[]; rows: number; cells?: string[][] }) {
  return (
    <div className="t-bg flex h-full w-full flex-col overflow-hidden rounded border t-line text-xs">
      <div className="t-fill-strong t-text flex shrink-0 border-b t-line font-bold">
        {cols.map((c, i) => (
          <div key={i} className="t-line flex-1 truncate border-r px-2 py-1 last:border-r-0">
            {c}
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="t-line flex flex-1 border-b last:border-b-0">
          {cols.map((_, c) => (
            <div key={c} className="t-line t-text flex-1 truncate border-r px-2 py-1 last:border-r-0">
              {cells?.[r]?.[c] ?? ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ImageX() {
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
      <line x1="0" y1="0" x2="100%" y2="100%" stroke="#9ca3af" strokeWidth="1" />
      <line x1="100%" y1="0" x2="0" y2="100%" stroke="#9ca3af" strokeWidth="1" />
    </svg>
  )
}

export function renderPart(p: PartLike) {
  switch (p.partType) {
    case 'heading':
      return <div className="t-text font-hand text-lg font-bold">{p.label ?? '見出し'}</div>
    case 'label':
      return <div className="t-text font-hand text-sm">{p.label ?? 'ラベル'}</div>
    case 'link':
      return <span className="t-text font-hand text-sm underline">{p.label ?? 'リンク'}</span>
    case 'badge':
      return (
        <span className="t-fill-strong t-text inline-flex h-full w-full items-center justify-center rounded-full border t-line px-2 text-xs">
          {p.label ?? 'NEW'}
        </span>
      )
    case 'input': {
      const t = p.type ?? 'text'
      const box = 't-bg t-muted flex h-full w-full items-center gap-2 rounded border t-line px-2 text-sm'
      const ic = (name: string) => (
        <span className="t-text h-4 w-4 shrink-0">
          <IconGlyph name={name} />
        </span>
      )
      if (t === 'password')
        return (
          <div className={box}>
            <span className="tracking-widest">••••••••</span>
          </div>
        )
      if (t === 'search')
        return (
          <div className={box}>
            {ic('search')}
            <span className="min-w-0 flex-1 truncate">{p.placeholder ?? '検索'}</span>
          </div>
        )
      if (t === 'date')
        return (
          <div className={box}>
            <span className="min-w-0 flex-1 truncate">{p.placeholder || 'YYYY/MM/DD'}</span>
            {ic('calendar')}
          </div>
        )
      if (t === 'time')
        return (
          <div className={box}>
            <span className="min-w-0 flex-1 truncate">{p.placeholder || 'HH:MM'}</span>
            {ic('clock')}
          </div>
        )
      if (t === 'email')
        return (
          <div className={box}>
            <span className="min-w-0 flex-1 truncate">{p.placeholder || 'name@example.com'}</span>
            {ic('mail')}
          </div>
        )
      if (t === 'color')
        return (
          <div className={box}>
            <span className="h-4 w-5 shrink-0 rounded border t-line" style={{ background: '#9ca3af' }} />
            <span className="min-w-0 flex-1 truncate">#9CA3AF</span>
          </div>
        )
      if (t === 'number')
        return (
          <div className={box}>
            <span className="min-w-0 flex-1 truncate">{p.placeholder || '0'}</span>
            <span className="t-muted flex shrink-0 flex-col text-[8px] leading-none">
              <span>▲</span>
              <span>▼</span>
            </span>
          </div>
        )
      return (
        <div className={box}>
          <span className="min-w-0 flex-1 truncate">{p.placeholder ?? '入力'}</span>
        </div>
      )
    }
    case 'textarea':
      return (
        <div className="t-bg t-muted h-full w-full overflow-hidden rounded border t-line px-2 py-1 text-sm">
          {p.placeholder ?? '複数行入力'}
        </div>
      )
    case 'button':
      return (
        <div className="t-fill-strong t-text flex h-full w-full items-center justify-center rounded border t-border px-3 font-hand text-sm">
          {p.label ?? 'ボタン'}
        </div>
      )
    case 'select':
      return (
        <div className="t-bg t-muted flex h-full w-full items-center justify-between rounded border t-line px-2 text-sm">
          <span>{p.options?.[0] ?? '選択'}</span>
          <span aria-hidden>▾</span>
        </div>
      )
    case 'checkbox':
      return (
        <div className="t-text flex h-full w-full items-center gap-2 font-hand text-sm">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border t-border text-[10px] leading-none">
            {p.checked ? '✓' : ''}
          </span>
          <span>{p.label ?? 'チェック項目'}</span>
        </div>
      )
    case 'radio':
      return (
        <div className="t-text flex h-full w-full flex-col justify-center gap-1.5 font-hand text-sm">
          {(p.items ?? ['選択肢1', '選択肢2', '選択肢3']).map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="relative inline-block h-4 w-4 shrink-0 rounded-full border t-border">
                {i === (p.selected ?? 0) && (
                  <span
                    className="absolute inset-[3px] rounded-full"
                    style={{ background: 'var(--jam-ink)' }}
                  />
                )}
              </span>
              <span className="truncate">{it}</span>
            </div>
          ))}
        </div>
      )
    case 'toggle':
      return (
        <div className="t-text flex h-full w-full items-center gap-2 font-hand text-sm">
          <span
            className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full"
            style={{ background: p.on ? 'var(--jam-ink)' : '#d1d5db' }}
          >
            <span
              className="absolute h-4 w-4 rounded-full bg-white shadow"
              style={{ left: p.on ? '18px' : '2px' }}
            />
          </span>
          <span className="truncate">{p.label ?? '有効'}</span>
        </div>
      )
    case 'header':
      return (
        <div className="t-fill flex h-full w-full items-center justify-between rounded border t-line px-4">
          <span className="t-text font-hand text-base font-bold">{p.logo ?? 'Logo'}</span>
          <nav className="t-muted flex gap-5 font-hand text-sm">
            {(p.nav ?? ['メニュー1', 'メニュー2', 'メニュー3']).map((n, i) => (
              <span key={i}>{n}</span>
            ))}
          </nav>
          <span className="t-text rounded border t-border px-3 py-1 font-hand text-sm">
            {p.cta ?? 'ログイン'}
          </span>
        </div>
      )
    case 'footer':
      return (
        <div className="t-fill t-muted flex h-full w-full items-center justify-center rounded border t-line font-hand text-xs">
          {p.label ?? '© 2026 Your Company'}
        </div>
      )
    case 'sidebar':
      return (
        <div className="t-fill t-text flex h-full w-full flex-col gap-1 rounded border t-line p-2 font-hand text-sm">
          {(p.items ?? ['メニュー1', 'メニュー2', 'メニュー3', 'メニュー4']).map((it, i) => (
            <div key={i} className={'rounded px-2 py-1.5 ' + (i === 0 ? 't-fill-strong' : '')}>
              {it}
            </div>
          ))}
        </div>
      )
    case 'area':
      return (
        <div className="t-fill t-muted flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed t-line px-3 text-center font-hand text-sm">
          {p.label ?? 'ここにドロップ'}
        </div>
      )
    case 'divider':
      return (
        <div className="flex h-full w-full items-center">
          <div className="h-px w-full" style={{ backgroundColor: 'var(--jam-ink)' }} />
        </div>
      )
    case 'panel':
      // 汎用の角丸枠。既定は塗りなし(枠だけ)。テーマ「背景」を入れた時だけ色が付く。
      return (
        <div
          className="h-full w-full rounded-md border t-line"
          style={p.colorBg ? { backgroundColor: p.colorBg } : undefined}
        />
      )
    case 'image':
      return p.src ? (
        <img
          src={p.src}
          alt=""
          draggable={false}
          className="t-bg h-full w-full rounded border t-line object-contain"
        />
      ) : (
        <div className="t-fill relative h-full w-full overflow-hidden rounded border t-line">
          <ImageX />
        </div>
      )
    case 'icon':
      return (
        <div className="t-text flex h-full w-full items-center justify-center">
          <IconGlyph name={p.icon} />
        </div>
      )
    case 'tabs': {
      const items = p.items ?? ['タブ1', 'タブ2', 'タブ3']
      const sel = p.selected ?? 0
      return (
        <div className="t-text flex h-full w-full items-end gap-1 border-b t-line font-hand text-sm">
          {items.map((it, i) => (
            <div
              key={i}
              className={'truncate px-3 py-1.5 ' + (i === sel ? 't-fill font-bold' : 't-muted')}
              style={{ borderBottom: '2px solid', borderColor: i === sel ? 'var(--jam-ink)' : 'transparent', marginBottom: -1 }}
            >
              {it}
            </div>
          ))}
        </div>
      )
    }
    case 'pagination': {
      const pages = Math.max(1, p.pages ?? 5)
      const sel = p.selected ?? 0
      const nums = Array.from({ length: Math.min(pages, 7) }, (_, i) => i)
      return (
        <div className="t-text flex h-full w-full items-center justify-center gap-1 font-hand text-sm">
          <span className="t-muted px-1">‹</span>
          {nums.map((i) => (
            <span
              key={i}
              className={
                'flex h-7 min-w-[28px] items-center justify-center rounded border px-2 ' +
                (i === sel ? 't-fill-strong t-border font-bold' : 't-line t-muted')
              }
            >
              {i + 1}
            </span>
          ))}
          {pages > 7 && <span className="t-muted px-1">…</span>}
          <span className="t-muted px-1">›</span>
        </div>
      )
    }
    case 'breadcrumbs': {
      const items = p.items ?? ['ホーム', 'カテゴリ', '現在のページ']
      return (
        <div className="t-muted flex h-full w-full items-center gap-1 overflow-hidden font-hand text-sm">
          {items.map((it, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-60">›</span>}
              <span className={'truncate ' + (i === items.length - 1 ? 't-text font-bold' : '')}>{it}</span>
            </span>
          ))}
        </div>
      )
    }
    case 'steps': {
      const items = p.items ?? ['入力', '確認', '完了']
      const sel = p.selected ?? 0
      return (
        <div className="t-text flex h-full w-full items-center font-hand text-xs">
          {items.map((it, i) => (
            <div key={i} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ' +
                    (i <= sel ? 't-fill-strong t-border font-bold' : 't-line t-muted')
                  }
                >
                  {i + 1}
                </span>
                <span className={'truncate ' + (i === sel ? 'font-bold' : 't-muted')}>{it}</span>
              </div>
              {i < items.length - 1 && (
                <div className="mx-1 mb-4 h-px flex-1" style={{ background: 'var(--jam-ink)', opacity: 0.4 }} />
              )}
            </div>
          ))}
        </div>
      )
    }
    case 'menu': {
      const items = p.items ?? ['編集', '複製', '削除']
      return (
        <div className="t-bg t-text flex h-full w-full flex-col overflow-hidden rounded-md border t-border py-1 font-hand text-sm shadow-lg">
          {items.map((it, i) => (
            <span key={i} className="truncate px-3 py-1.5">
              {it}
            </span>
          ))}
        </div>
      )
    }
    case 'accordion': {
      const open = p.on ?? true
      return (
        <div className="t-bg t-text flex h-full w-full flex-col overflow-hidden rounded border t-line font-hand text-sm">
          <div className="t-fill flex shrink-0 items-center justify-between px-3 py-2">
            <span className="truncate font-bold">{p.label ?? 'セクション見出し'}</span>
            <span aria-hidden>{open ? '▾' : '▸'}</span>
          </div>
          {open && (
            <div className="t-muted min-h-0 flex-1 px-3 py-2 text-xs">{p.body ?? '中身のテキスト…'}</div>
          )}
        </div>
      )
    }
    case 'list': {
      const items = p.items ?? ['項目1', '項目2', '項目3']
      return (
        <div className="t-bg t-text flex h-full w-full flex-col overflow-hidden rounded border t-line font-hand text-sm">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 border-b t-line px-3 py-2 last:border-b-0">
              <span className="t-fill-strong h-6 w-6 shrink-0 rounded-full" />
              <span className="min-w-0 flex-1 truncate">{it}</span>
              <span className="t-muted">›</span>
            </div>
          ))}
        </div>
      )
    }
    case 'stat':
      return (
        <div className="t-bg t-text flex h-full w-full flex-col justify-center rounded-lg border t-line px-4">
          <span className="font-hand text-2xl font-bold leading-tight">{p.value ?? '1,234'}</span>
          <span className="t-muted font-hand text-xs">{p.label ?? '指標名'}</span>
        </div>
      )
    case 'avatar':
      if (p.src)
        return (
          <img
            src={p.src}
            alt=""
            draggable={false}
            className="h-full w-full rounded-full border t-line object-cover"
          />
        )
      if (p.label)
        return (
          <div className="t-fill-strong t-text flex h-full w-full items-center justify-center rounded-full border t-line font-hand text-sm font-bold">
            {p.label}
          </div>
        )
      // 既定: よくある人影のシルエット（頭＋肩）。円でクリップ。
      return (
        <div className="t-fill-strong relative h-full w-full overflow-hidden rounded-full border t-line">
          <svg viewBox="0 0 24 24" fill="currentColor" className="t-text absolute inset-0 h-full w-full" style={{ opacity: 0.45 }}>
            <circle cx="12" cy="9" r="4.2" />
            <path d="M12 14.4c-4.3 0-7.6 2.6-7.6 6.1V24h15.2v-3.5c0-3.5-3.3-6.1-7.6-6.1z" />
          </svg>
        </div>
      )
    case 'alert':
      return (
        <div
          className="t-fill t-text flex h-full w-full items-center gap-2 rounded border t-line px-3 font-hand text-sm"
          style={{ borderLeftWidth: 4, borderLeftColor: 'var(--jam-ink)' }}
        >
          <span className="t-text h-5 w-5 shrink-0">
            <IconGlyph name={p.icon ?? 'info'} />
          </span>
          <span className="min-w-0 flex-1 truncate">{p.label ?? '情報メッセージ'}</span>
        </div>
      )
    case 'toast':
      return (
        <div
          className="flex h-full w-full items-center gap-2 rounded-lg px-3 font-hand text-sm shadow-lg"
          style={{ background: 'var(--jam-ink)', color: 'var(--jam-bg)' }}
        >
          <span className="h-4 w-4 shrink-0">
            <IconGlyph name={p.icon ?? 'check'} />
          </span>
          <span className="min-w-0 flex-1 truncate">{p.label ?? '保存しました'}</span>
        </div>
      )
    case 'empty':
      return (
        <div className="t-muted flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed t-line px-4 text-center font-hand text-sm">
          <span className="h-8 w-8">
            <IconGlyph name="inbox" />
          </span>
          <span>{p.label ?? 'データがありません'}</span>
        </div>
      )
    case 'progress': {
      const pct = Math.max(0, Math.min(100, p.percent ?? 40))
      return (
        <div className="flex h-full w-full items-center">
          <div className="t-fill h-2.5 w-full overflow-hidden rounded-full">
            <div className="h-full rounded-full" style={{ width: pct + '%', background: 'var(--jam-ink)' }} />
          </div>
        </div>
      )
    }
    case 'file':
      return (
        <div className="t-fill t-muted flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed t-line px-4 text-center font-hand text-sm">
          <span className="h-7 w-7">
            <IconGlyph name="upload" />
          </span>
          <span>{p.label ?? 'ファイルをドロップ / クリックして選択'}</span>
        </div>
      )
    case 'slider': {
      const pct = Math.max(0, Math.min(100, p.percent ?? 50))
      return (
        <div className="flex h-full w-full items-center">
          <div className="t-fill-strong relative h-1.5 w-full rounded-full">
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: pct + '%', background: 'var(--jam-ink)' }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white t-border"
              style={{ left: pct + '%' }}
            />
          </div>
        </div>
      )
    }
    case 'tags': {
      const items = p.items ?? ['タグ', 'ラベル', 'カテゴリ']
      return (
        <div className="t-text flex h-full w-full flex-wrap content-start items-start gap-1.5 overflow-hidden font-hand text-xs">
          {items.map((it, i) => (
            <span key={i} className="t-fill-strong inline-flex items-center gap-1 rounded-full border t-line px-2 py-0.5">
              {it}
              <span className="t-muted">×</span>
            </span>
          ))}
        </div>
      )
    }
    case 'stepper':
      return (
        <div className="t-text flex h-full w-full items-stretch overflow-hidden rounded border t-line font-hand text-sm">
          <span className="t-fill flex w-9 shrink-0 items-center justify-center border-r t-line">－</span>
          <span className="flex flex-1 items-center justify-center">{p.value ?? '1'}</span>
          <span className="t-fill flex w-9 shrink-0 items-center justify-center border-l t-line">＋</span>
        </div>
      )
    case 'iconrail': {
      const top = p.items ?? ['home', 'search', 'bell', 'user']
      const bottom = p.itemsBottom ?? ['gear']
      const sel = p.selected ?? 0
      const cell = (name: string, active: boolean, key: number) => (
        <div
          key={key}
          className={'relative flex h-11 w-full shrink-0 items-center justify-center ' + (active ? 't-text' : 't-muted')}
        >
          {active && (
            <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r" style={{ background: 'var(--jam-ink)' }} />
          )}
          <span className="h-6 w-6">
            <IconGlyph name={name} />
          </span>
        </div>
      )
      return (
        <div className="t-fill flex h-full w-full flex-col rounded border t-line py-2">
          <div className="flex flex-col">{top.map((n, i) => cell(n, i === sel, i))}</div>
          <div className="mt-auto flex flex-col">{bottom.map((n, i) => cell(n, false, 1000 + i))}</div>
        </div>
      )
    }
    case 'chatinput':
      return (
        <div className="t-bg flex h-full w-full items-center gap-2 rounded-2xl border t-line px-3 py-2">
          <span className="t-muted min-w-0 flex-1 truncate font-hand text-sm">{p.placeholder ?? 'メッセージを入力…'}</span>
          <span className="t-fill-strong t-text flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <span className="h-4 w-4">
              <IconGlyph name="send" />
            </span>
          </span>
        </div>
      )
    case 'bubble': {
      const right = !!p.on
      const fill = right ? 't-fill-strong' : 't-fill'
      return (
        <div className={'flex h-full w-full items-start ' + (right ? 'justify-end' : 'justify-start')}>
          <div className="relative max-w-full">
            <div className={fill + ' t-text whitespace-pre-wrap break-words rounded-2xl px-3 py-2 font-hand text-sm'}>
              {p.body ?? 'メッセージ'}
            </div>
            <span
              className={'absolute bottom-2 h-2.5 w-2.5 rotate-45 ' + fill}
              style={right ? { right: -3 } : { left: -3 }}
            />
          </div>
        </div>
      )
    }
    case 'barchart': {
      const vals = parseNums(p.value, [30, 70, 45, 90, 60])
      const max = Math.max(...vals, 1)
      const n = vals.length
      const gap = 100 / n
      const bw = gap * 0.6
      return (
        <div className="t-text h-full w-full">
          <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-full w-full">
            <line x1="0" y1="58" x2="100" y2="58" stroke="currentColor" strokeWidth="1" opacity="0.5" vectorEffect="non-scaling-stroke" />
            {vals.map((v, i) => {
              const h = (v / max) * 52
              return <rect key={i} x={i * gap + (gap - bw) / 2} y={56 - h} width={bw} height={h} fill="currentColor" fillOpacity="0.8" />
            })}
          </svg>
        </div>
      )
    }
    case 'linechart': {
      const vals = parseNums(p.value, [20, 45, 30, 60, 50, 80])
      const max = Math.max(...vals, 1)
      const n = vals.length
      const pts = vals
        .map((v, i) => `${n === 1 ? 50 : (i / (n - 1)) * 100},${(56 - (v / max) * 52).toFixed(2)}`)
        .join(' ')
      return (
        <div className="t-text h-full w-full">
          <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-full w-full">
            <line x1="0" y1="58" x2="100" y2="58" stroke="currentColor" strokeWidth="1" opacity="0.5" vectorEffect="non-scaling-stroke" />
            <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      )
    }
    case 'piechart': {
      const vals = parseNums(p.value, [35, 25, 20, 20]).filter((v) => v > 0)
      const ops = [0.85, 0.6, 0.4, 0.7, 0.5, 0.3, 0.55, 0.25]
      return (
        <div className="t-text flex h-full w-full items-center justify-center">
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
            {vals.length <= 1 ? (
              <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.7" />
            ) : (
              piePaths(vals).map((d, i) => (
                <path key={i} d={d} fill="currentColor" fillOpacity={ops[i % ops.length]} stroke="var(--jam-bg)" strokeWidth="0.5" />
              ))
            )}
          </svg>
        </div>
      )
    }
    case 'table':
      return <TableMock cols={p.columns ?? ['列1', '列2', '列3']} rows={p.rows ?? 3} cells={p.cells} />
    case 'card':
      return (
        <div className="t-bg flex h-full w-full flex-col rounded-lg border t-line p-2">
          <div className="t-fill relative mb-2 min-h-0 flex-1 overflow-hidden rounded">
            <ImageX />
          </div>
          <div className="t-text font-hand text-sm font-bold">{p.label ?? 'タイトル'}</div>
          <div className="t-muted font-hand text-xs">{p.body ?? '説明テキスト…'}</div>
        </div>
      )
    case 'modal':
      return (
        <div className="t-bg flex h-full w-full flex-col rounded-lg border t-border shadow-lg">
          <div className="t-text border-b t-line px-3 py-2 font-hand text-sm font-bold">
            {p.label ?? 'ダイアログ'}
          </div>
          <div className="t-muted min-h-0 flex-1 px-3 py-2 font-hand text-sm">{p.body ?? '本文…'}</div>
          <div className="flex justify-end gap-2 border-t t-line px-3 py-2">
            <span className="t-muted rounded border t-line px-2 py-0.5 font-hand text-sm">
              {p.cancelLabel ?? 'キャンセル'}
            </span>
            <span className="t-fill-strong t-text rounded border t-border px-2 py-0.5 font-hand text-sm">
              {p.okLabel ?? 'OK'}
            </span>
          </div>
        </div>
      )
    default:
      return null
  }
}
