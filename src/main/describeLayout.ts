// ドキュメントJSON → LLMが画面構成を把握しやすいテキスト要約に変換する。
// （renderer の型には依存せず、JSONを緩く解釈する）

interface AnyNode {
  id: string
  type?: string
  parentId?: string
  position?: { x: number; y: number }
  width?: number
  height?: number
  data?: Record<string, unknown>
}
interface DocLike {
  meta?: { name?: string }
  nodes?: AnyNode[]
  edges?: unknown[]
}

const JA: Record<string, string> = {
  label: 'ラベル', heading: '見出し', link: 'リンク', badge: 'バッジ',
  input: '入力欄', textarea: 'テキストエリア', select: 'セレクト', checkbox: 'チェック',
  radio: 'ラジオ', toggle: 'トグル', button: 'ボタン', area: 'エリア枠', panel: '角丸枠',
  divider: '区切り線', header: 'ヘッダ', footer: 'フッタ', sidebar: 'サイドバー', image: '画像',
  icon: 'アイコン', table: 'テーブル', card: 'カード', modal: 'モーダル', menu: 'メニュー',
  tabs: 'タブ', pagination: 'ページネーション', breadcrumbs: 'パンくず', steps: 'ステップ',
  accordion: 'アコーディオン', list: '一覧リスト', stat: '統計カード', avatar: 'アバター',
  alert: 'アラート', toast: 'トースト', empty: '空状態', progress: '進捗バー', file: 'ファイルUP',
  slider: 'スライダー', tags: 'タグ', stepper: '数量', barchart: '棒グラフ',
  linechart: '折れ線グラフ', piechart: '円グラフ',
  iconrail: 'アイコンレール', chatinput: 'チャット入力', bubble: '吹き出し'
}

function pos(n: AnyNode): { x: number; y: number } {
  return n.position ?? { x: 0, y: 0 }
}

// 親(parentId)のオフセットを足し込んだ絶対座標
function absOf(n: AnyNode, byId: Map<string, AnyNode>): { x: number; y: number } {
  let { x, y } = pos(n)
  let p = n.parentId
  const seen = new Set<string>()
  while (p && byId.has(p) && !seen.has(p)) {
    seen.add(p)
    const par = byId.get(p) as AnyNode
    x += pos(par).x
    y += pos(par).y
    p = par.parentId
  }
  return { x, y }
}

function str(d: Record<string, unknown>, k: string): string {
  return typeof d[k] === 'string' ? (d[k] as string) : ''
}
function list(d: Record<string, unknown>, k: string): string[] {
  return Array.isArray(d[k]) ? (d[k] as unknown[]).map((x) => String(x)) : []
}
function num(d: Record<string, unknown>, k: string): number | undefined {
  return typeof d[k] === 'number' ? (d[k] as number) : undefined
}

// 部品1つを1行のテキストに
function descPart(d: Record<string, unknown>): string {
  const pt = String(d.partType ?? '?')
  const t = JA[pt] ?? pt
  switch (pt) {
    case 'input':
      return `${t}[${str(d, 'type') || 'text'}]「${str(d, 'placeholder')}」`
    case 'textarea':
      return `${t}「${str(d, 'placeholder')}」`
    case 'table':
      return `${t} 列[${list(d, 'columns').join('・')}] ${num(d, 'rows') ?? 0}行`
    case 'header':
      return `${t} ロゴ:${str(d, 'logo')} / nav:[${list(d, 'nav').join('・')}] / 右:${str(d, 'cta')}`
    case 'select':
      return `${t}[${list(d, 'options').join('/')}]`
    case 'radio':
      return `${t}[${list(d, 'items').join('/')}] 選択:${num(d, 'selected') ?? 0}`
    case 'list':
    case 'tags':
    case 'menu':
    case 'breadcrumbs':
      return `${t}[${list(d, 'items').join('・')}]`
    case 'tabs':
    case 'steps':
      return `${t}[${list(d, 'items').join('・')}] 選択:${num(d, 'selected') ?? 0}`
    case 'pagination':
      return `${t} ${num(d, 'pages') ?? 0}ページ`
    case 'progress':
    case 'slider':
      return `${t} ${num(d, 'percent') ?? 0}%`
    case 'stat':
      return `${t} ${str(d, 'value')} / ${str(d, 'label')}`
    case 'icon':
      return `${t}(${str(d, 'icon')})`
    case 'toggle':
      return `${t}「${str(d, 'label')}」${d.on ? 'ON' : 'OFF'}`
    case 'checkbox':
      return `${t}「${str(d, 'label')}」${d.checked ? '✓' : ''}`
    case 'barchart':
    case 'linechart':
    case 'piechart':
      return `${t} 値[${str(d, 'value')}]`
    case 'iconrail':
      return `${t} 上[${list(d, 'items').join('・')}] 下[${list(d, 'itemsBottom').join('・')}]`
    case 'bubble':
      return `${t}${d.on ? '(右/自分)' : '(左/相手)'}「${str(d, 'body')}」`
    case 'modal':
      return `${t}「${str(d, 'label')}」本文:${str(d, 'body')}`
    case 'card':
      return `${t}「${str(d, 'label')}」${str(d, 'body')}`
    case 'image':
      return d.src ? `${t}(画像あり)` : `${t}(未設定)`
    default:
      return str(d, 'label')
        ? `${t}「${str(d, 'label')}」`
        : str(d, 'placeholder')
          ? `${t}「${str(d, 'placeholder')}」`
          : t
  }
}

// ノード1つ（part / jgroup）を行テキストに
function descNode(n: AnyNode): string {
  const d = n.data ?? {}
  if (n.type === 'jgroup') {
    const children = Array.isArray(d.children) ? (d.children as { data?: Record<string, unknown> }[]) : []
    const inner = children.map((c) => descPart(c.data ?? {})).join(' + ')
    return `グループ{ ${inner} }`
  }
  return descPart(d)
}

export function describeLayout(doc: DocLike | null | undefined): string {
  const nodes = doc?.nodes ?? []
  if (nodes.length === 0) return '（ボードは空です）'
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const screens = nodes.filter((n) => n.type === 'screen')
  const placeables = nodes.filter((n) => n.type === 'part' || n.type === 'jgroup')

  const membersOf = (s: AnyNode): AnyNode[] => {
    const sp = pos(s)
    const sw = s.width ?? 0
    const sh = s.height ?? 0
    return placeables
      .filter((p) => {
        if (p.parentId === s.id) return true
        if (p.parentId) return false
        const a = absOf(p, byId)
        const cx = a.x + (p.width ?? 0) / 2
        const cy = a.y + (p.height ?? 0) / 2
        return cx >= sp.x && cx <= sp.x + sw && cy >= sp.y && cy <= sp.y + sh
      })
      .sort((a, b) => pos(a).y - pos(b).y || pos(a).x - pos(b).x)
  }

  const claimed = new Set<string>()
  const out: string[] = []
  out.push(`# ボード「${doc?.meta?.name ?? 'untitled'}」  画面数:${screens.length} / 部品数:${placeables.length}`)

  for (const s of screens) {
    const d = s.data ?? {}
    const bg = str(d, 'colorBg') ? ` 背景:${str(d, 'colorBg')}` : ''
    const sp = pos(s)
    out.push(`\n## 画面「${str(d, 'title') || '(無題)'}」 (位置 ${Math.round(sp.x)},${Math.round(sp.y)} / ${s.width ?? '?'}×${s.height ?? '?'}${bg})`)
    const ms = membersOf(s)
    if (ms.length === 0) out.push('  （部品なし）')
    for (const m of ms) {
      claimed.add(m.id)
      out.push(`  - ${descNode(m)}`)
    }
  }

  const loose = placeables.filter((p) => !claimed.has(p.id))
  if (loose.length) {
    out.push('\n## 画面外の部品')
    for (const p of loose) out.push(`  - ${descNode(p)}`)
  }

  const notes = nodes.filter((n) => n.type === 'note' || n.type === 'comment')
  if (notes.length) {
    out.push('\n## メモ/コメント')
    for (const n of notes) out.push(`  - ${n.type === 'note' ? '付箋' : 'コメント'}「${str(n.data ?? {}, 'text')}」`)
  }

  const edgeCount = doc?.edges?.length ?? 0
  if (edgeCount) out.push(`\n## 注釈線: ${edgeCount}本`)

  return out.join('\n')
}
