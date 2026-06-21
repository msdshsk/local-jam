import type { PartType, PartData } from './types'
import { ICON_CHOICES } from './icons'

export type ResizePolicy = 'free' | 'aspect' | 'width' | 'none'
export type PartCategory = 'layout' | 'nav' | 'form' | 'data' | 'feedback' | 'overlay' | 'text'

// インスペクタで編集できる項目の定義
// 'csv' = カンマ区切り数値（テキスト編集だが、ノード上のインライン編集は無効＝ダブルクリックでインスペクタへ）
export interface FieldDef {
  key: string
  label: string
  // multiline=複数行テキスト, iconlist=アイコン絵から選ぶ配列
  kind: 'text' | 'list' | 'bool' | 'num' | 'choice' | 'csv' | 'multiline' | 'iconlist'
  choices?: { value: string; label: string }[]
}

export interface AtomDefault {
  label: string
  category: PartCategory
  w: number
  h: number
  resize: ResizePolicy
  minW: number
  minH: number
  fields: FieldDef[]
  data: Partial<PartData>
}

export const CATEGORY_ORDER: PartCategory[] = ['layout', 'nav', 'form', 'data', 'feedback', 'overlay', 'text']
export const CATEGORY_LABEL: Record<PartCategory, string> = {
  layout: 'レイアウト',
  nav: 'ナビ・構造',
  form: 'フォーム',
  data: 'データ表示',
  feedback: '状態・通知',
  overlay: 'オーバーレイ',
  text: 'テキスト'
}

// input[type=*] の種類（1つの input 部品で見た目を切替）
const INPUT_TYPES = [
  { value: 'text', label: 'テキスト' },
  { value: 'password', label: 'パスワード' },
  { value: 'email', label: 'メール' },
  { value: 'number', label: '数値' },
  { value: 'tel', label: '電話' },
  { value: 'url', label: 'URL' },
  { value: 'date', label: '日付' },
  { value: 'time', label: '時刻' },
  { value: 'color', label: '色' },
  { value: 'search', label: '検索' }
]

const T = (key: string, label: string): FieldDef => ({ key, label, kind: 'text' })
const L = (key: string, label: string): FieldDef => ({ key, label, kind: 'list' })
const B = (key: string, label: string): FieldDef => ({ key, label, kind: 'bool' })
const N = (key: string, label: string): FieldDef => ({ key, label, kind: 'num' })
const C = (key: string, label: string, choices: FieldDef['choices']): FieldDef => ({ key, label, kind: 'choice', choices })
const CSV = (key: string, label: string): FieldDef => ({ key, label, kind: 'csv' })
const M = (key: string, label: string): FieldDef => ({ key, label, kind: 'multiline' })
const IL = (key: string, label: string): FieldDef => ({ key, label, kind: 'iconlist' })

// 部品レジストリ。拡充 = ここへ1エントリ追加。fields がインスペクタ項目に直結。
export const ATOMS: Record<PartType, AtomDefault> = {
  // テキスト
  heading: { label: '見出し', category: 'text', w: 240, h: 32, resize: 'width', minW: 60, minH: 24, fields: [T('label', 'テキスト')], data: { label: '見出し' } },
  label: { label: 'ラベル', category: 'text', w: 160, h: 22, resize: 'width', minW: 40, minH: 18, fields: [T('label', 'テキスト')], data: { label: 'ラベル' } },
  link: { label: 'リンク', category: 'text', w: 120, h: 24, resize: 'width', minW: 40, minH: 18, fields: [T('label', 'テキスト')], data: { label: 'リンク' } },
  badge: { label: 'バッジ', category: 'text', w: 80, h: 24, resize: 'width', minW: 40, minH: 20, fields: [T('label', 'テキスト')], data: { label: 'NEW' } },
  // フォーム
  input: { label: '入力', category: 'form', w: 240, h: 40, resize: 'width', minW: 80, minH: 32, fields: [T('placeholder', 'プレースホルダ'), C('type', '種類', INPUT_TYPES)], data: { placeholder: '入力', type: 'text' } },
  textarea: { label: 'テキストエリア', category: 'form', w: 240, h: 80, resize: 'free', minW: 120, minH: 48, fields: [T('placeholder', 'プレースホルダ')], data: { placeholder: '複数行入力' } },
  select: { label: 'セレクト', category: 'form', w: 200, h: 40, resize: 'width', minW: 80, minH: 32, fields: [L('options', '選択肢')], data: { options: ['選択肢1', '選択肢2'] } },
  checkbox: { label: 'チェック', category: 'form', w: 180, h: 28, resize: 'width', minW: 100, minH: 24, fields: [T('label', 'ラベル'), B('checked', 'チェック状態')], data: { label: 'チェック項目', checked: false } },
  radio: { label: 'ラジオ', category: 'form', w: 180, h: 90, resize: 'width', minW: 100, minH: 60, fields: [L('items', '選択肢'), N('selected', '選択中(0始まり)')], data: { items: ['選択肢1', '選択肢2', '選択肢3'], selected: 0 } },
  toggle: { label: 'トグル', category: 'form', w: 160, h: 28, resize: 'width', minW: 80, minH: 24, fields: [T('label', 'ラベル'), B('on', 'ON/OFF')], data: { label: '有効', on: true } },
  button: { label: 'ボタン', category: 'form', w: 120, h: 40, resize: 'width', minW: 60, minH: 32, fields: [T('label', 'ラベル')], data: { label: 'ボタン' } },
  // レイアウト
  header: {
    label: 'ヘッダ', category: 'layout', w: 1200, h: 56, resize: 'width', minW: 320, minH: 48,
    fields: [T('logo', 'ロゴ'), L('nav', 'ナビ項目'), T('cta', '右ボタン')],
    data: { logo: 'Logo', nav: ['メニュー1', 'メニュー2', 'メニュー3'], cta: 'ログイン' }
  },
  footer: {
    label: 'フッタ', category: 'layout', w: 1200, h: 48, resize: 'width', minW: 320, minH: 36,
    fields: [T('label', 'テキスト')], data: { label: '© 2026 Your Company' }
  },
  sidebar: {
    label: 'サイドバー', category: 'layout', w: 220, h: 600, resize: 'free', minW: 120, minH: 160,
    fields: [L('items', 'メニュー項目')], data: { items: ['メニュー1', 'メニュー2', 'メニュー3', 'メニュー4'] }
  },
  area: { label: 'エリア枠', category: 'layout', w: 320, h: 180, resize: 'free', minW: 80, minH: 60, fields: [T('label', 'テキスト')], data: { label: 'ここにドロップ' } },
  panel: { label: '角丸枠', category: 'layout', w: 300, h: 200, resize: 'free', minW: 60, minH: 40, fields: [], data: {} },
  divider: { label: '区切り線', category: 'layout', w: 300, h: 16, resize: 'width', minW: 40, minH: 8, fields: [], data: {} },
  // データ表示
  table: {
    label: 'テーブル', category: 'data', w: 460, h: 220, resize: 'free', minW: 200, minH: 100,
    fields: [L('columns', '列見出し')],
    data: { columns: ['列1', '列2', '列3'], rows: 3, cells: [] }
  },
  card: {
    label: 'カード', category: 'data', w: 240, h: 240, resize: 'free', minW: 120, minH: 140,
    fields: [T('label', 'タイトル'), T('body', '説明')], data: { label: 'タイトル', body: '説明テキスト…' }
  },
  image: { label: '画像', category: 'data', w: 220, h: 150, resize: 'free', minW: 60, minH: 40, fields: [], data: {} },
  icon: { label: 'アイコン', category: 'data', w: 40, h: 40, resize: 'aspect', minW: 16, minH: 16, fields: [C('icon', 'アイコン', ICON_CHOICES)], data: { icon: 'gear' } },
  // オーバーレイ
  modal: {
    label: 'モーダル', category: 'overlay', w: 420, h: 260, resize: 'free', minW: 200, minH: 140,
    fields: [T('label', 'タイトル'), T('body', '本文'), T('okLabel', 'OKボタン'), T('cancelLabel', 'キャンセルボタン')],
    data: { label: 'ダイアログ', body: '本文…', okLabel: 'OK', cancelLabel: 'キャンセル' }
  },
  menu: {
    label: 'ドロップダウンメニュー', category: 'overlay', w: 180, h: 130, resize: 'free', minW: 120, minH: 80,
    fields: [L('items', '項目')], data: { items: ['編集', '複製', '削除'] }
  },
  // ナビ・構造
  tabs: {
    label: 'タブ', category: 'nav', w: 360, h: 40, resize: 'width', minW: 160, minH: 32,
    fields: [L('items', 'タブ'), N('selected', '選択中(0始まり)')], data: { items: ['タブ1', 'タブ2', 'タブ3'], selected: 0 }
  },
  pagination: {
    label: 'ページネーション', category: 'nav', w: 300, h: 36, resize: 'width', minW: 160, minH: 28,
    fields: [N('pages', '総ページ数'), N('selected', '現在(0始まり)')], data: { pages: 5, selected: 0 }
  },
  breadcrumbs: {
    label: 'パンくず', category: 'nav', w: 320, h: 24, resize: 'width', minW: 120, minH: 18,
    fields: [L('items', '階層')], data: { items: ['ホーム', 'カテゴリ', '現在のページ'] }
  },
  steps: {
    label: 'ステップ', category: 'nav', w: 420, h: 60, resize: 'width', minW: 200, minH: 48,
    fields: [L('items', 'ステップ'), N('selected', '現在(0始まり)')], data: { items: ['入力', '確認', '完了'], selected: 0 }
  },
  accordion: {
    label: 'アコーディオン', category: 'layout', w: 320, h: 120, resize: 'free', minW: 160, minH: 44,
    fields: [T('label', '見出し'), T('body', '中身'), B('on', '開いた状態')], data: { label: 'セクション見出し', body: '中身のテキスト…', on: true }
  },
  // データ表示
  list: {
    label: '一覧リスト', category: 'data', w: 300, h: 180, resize: 'free', minW: 160, minH: 80,
    fields: [L('items', '行')], data: { items: ['項目1', '項目2', '項目3'] }
  },
  stat: {
    label: '統計カード', category: 'data', w: 180, h: 100, resize: 'free', minW: 100, minH: 64,
    fields: [T('value', '数値'), T('label', '指標名')], data: { value: '1,234', label: '指標名' }
  },
  avatar: {
    label: 'アバター', category: 'data', w: 48, h: 48, resize: 'aspect', minW: 24, minH: 24,
    fields: [T('label', 'イニシャル(空で人影)')], data: { label: '' }
  },
  barchart: {
    label: '棒グラフ', category: 'data', w: 220, h: 140, resize: 'free', minW: 100, minH: 80,
    fields: [CSV('value', '値(カンマ区切り)')], data: { value: '30,70,45,90,60' }
  },
  linechart: {
    label: '折れ線グラフ', category: 'data', w: 220, h: 140, resize: 'free', minW: 100, minH: 80,
    fields: [CSV('value', '値(カンマ区切り)')], data: { value: '20,45,30,60,50,80' }
  },
  piechart: {
    label: '円グラフ', category: 'data', w: 160, h: 160, resize: 'aspect', minW: 80, minH: 80,
    fields: [CSV('value', '値(カンマ区切り)')], data: { value: '35,25,20,20' }
  },
  // 状態・通知
  alert: {
    label: 'アラート/バナー', category: 'feedback', w: 360, h: 48, resize: 'width', minW: 160, minH: 36,
    fields: [C('icon', 'アイコン', ICON_CHOICES), T('label', 'メッセージ')], data: { icon: 'info', label: '情報メッセージ' }
  },
  toast: {
    label: 'トースト', category: 'feedback', w: 260, h: 44, resize: 'width', minW: 140, minH: 36,
    fields: [C('icon', 'アイコン', ICON_CHOICES), T('label', 'メッセージ')], data: { icon: 'check', label: '保存しました' }
  },
  empty: {
    label: '空状態', category: 'feedback', w: 320, h: 180, resize: 'free', minW: 160, minH: 100,
    fields: [T('label', 'メッセージ')], data: { label: 'データがありません' }
  },
  progress: {
    label: 'プログレスバー', category: 'feedback', w: 240, h: 16, resize: 'width', minW: 80, minH: 10,
    fields: [N('percent', '進捗(0-100)')], data: { percent: 40 }
  },
  // フォーム細部
  file: {
    label: 'ファイルアップロード', category: 'form', w: 320, h: 120, resize: 'free', minW: 160, minH: 72,
    fields: [T('label', 'テキスト')], data: { label: 'ファイルをドロップ / クリックして選択' }
  },
  slider: {
    label: 'スライダー', category: 'form', w: 220, h: 32, resize: 'width', minW: 100, minH: 24,
    fields: [N('percent', '値(0-100)')], data: { percent: 50 }
  },
  tags: {
    label: 'タグ・チップ', category: 'form', w: 280, h: 48, resize: 'free', minW: 120, minH: 32,
    fields: [L('items', 'タグ')], data: { items: ['タグ', 'ラベル', 'カテゴリ'] }
  },
  stepper: {
    label: '数量ステッパー', category: 'form', w: 120, h: 36, resize: 'width', minW: 80, minH: 28,
    fields: [T('value', '数値')], data: { value: '1' }
  },
  // ナビ: VSCode風のアイコンだけ左バー（上の領域＋最下部の領域）
  iconrail: {
    label: 'アイコンレール', category: 'nav', w: 56, h: 480, resize: 'free', minW: 44, minH: 120,
    fields: [IL('items', '上のアイコン'), IL('itemsBottom', '下のアイコン'), N('selected', '選択中(0始まり)')],
    data: { items: ['home', 'search', 'bell', 'user'], itemsBottom: ['gear'], selected: 0 }
  },
  // チャット
  chatinput: {
    label: 'チャット入力', category: 'form', w: 360, h: 56, resize: 'free', minW: 160, minH: 44,
    fields: [T('placeholder', 'プレースホルダ')], data: { placeholder: 'メッセージを入力…' }
  },
  bubble: {
    label: '吹き出し', category: 'data', w: 260, h: 72, resize: 'free', minW: 80, minH: 36,
    fields: [M('body', '本文'), B('on', '右寄せ(自分)')], data: { body: 'メッセージ', on: false }
  }
}

export function atomDefaults(type: PartType): { w: number; h: number; data: Partial<PartData> } {
  const a = ATOMS[type]
  return { w: a.w, h: a.h, data: { ...a.data } }
}

export function resizePolicy(type: PartType): { policy: ResizePolicy; minW: number; minH: number } {
  const a = ATOMS[type]
  return { policy: a.resize, minW: a.minW, minH: a.minH }
}
