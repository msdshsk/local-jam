import type { Node, Edge } from '@xyflow/react'

export type PartType =
  | 'label'
  | 'heading'
  | 'link'
  | 'badge'
  | 'input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'toggle'
  | 'button'
  | 'area'
  | 'divider'
  | 'panel'
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'image'
  | 'icon'
  | 'table'
  | 'card'
  | 'modal'
  // ナビ・構造
  | 'tabs'
  | 'pagination'
  | 'breadcrumbs'
  | 'steps'
  | 'accordion'
  | 'menu'
  // データ表示
  | 'list'
  | 'stat'
  | 'avatar'
  // グラフ
  | 'barchart'
  | 'linechart'
  | 'piechart'
  // 状態・通知
  | 'alert'
  | 'toast'
  | 'empty'
  | 'progress'
  // フォーム細部
  | 'file'
  | 'slider'
  | 'tags'
  | 'stepper'
  // ナビ / チャット
  | 'iconrail'
  | 'chatinput'
  | 'bubble'

export interface ScreenData extends Record<string, unknown> {
  title: string
  w: number
  h: number
  device: 'desktop' | 'tablet' | 'mobile' | 'custom'
  colorBg?: string
  colorText?: string
}

export interface PartData extends Record<string, unknown> {
  partType: PartType
  w: number
  h: number
  label?: string
  placeholder?: string
  options?: string[]
  // リッチ部品の編集項目
  logo?: string
  nav?: string[]
  cta?: string
  items?: string[]
  columns?: string[]
  rows?: number
  cells?: string[][]
  body?: string
  okLabel?: string
  cancelLabel?: string
  checked?: boolean
  on?: boolean
  selected?: number
  src?: string
  icon?: string
  // 追加部品用
  value?: string
  percent?: number
  pages?: number
  type?: string
  itemsBottom?: string[]
  // テーマ色（未指定は既定の --jam-* を継承）
  colorBg?: string
  colorInk?: string
  colorText?: string
}

// グループは「中身を内包する1ノード」。子はRFノードではなくこの配列で持つ。
// data に部品データ一式(PartData)を保持し、src等の取りこぼしを防ぐ。
export interface GroupChild {
  cid: string
  x: number
  y: number
  w: number
  h: number
  data: PartData
}

export interface GroupData extends Record<string, unknown> {
  children: GroupChild[]
}

// 付箋メモ / 一口コメント
export interface NoteData extends Record<string, unknown> {
  text: string
  w: number
  h: number
}
export interface CommentData extends Record<string, unknown> {
  text: string
  open: boolean
}

export type ScreenNode = Node<ScreenData, 'screen'>
export type PartNode = Node<PartData, 'part'>
export type GroupNode = Node<GroupData, 'jgroup'>
export type NoteNode = Node<NoteData, 'note'>
export type CommentNode = Node<CommentData, 'comment'>
export type JamNode = ScreenNode | GroupNode | PartNode | NoteNode | CommentNode
export type JamEdge = Edge

// マイテンプレート（選択範囲を保存したもの。userData にJSON保存）
export interface MyTemplate {
  id: string
  name: string
  nodes: JamNode[]
  edges?: JamEdge[]
}

// パレット一覧用の軽量メタ（本体は .ljat から都度取得）
export interface TemplateMeta {
  id: string
  name: string
}

// .ljam パッケージ内 document.json の中身
export interface JamDocument {
  version: number
  meta: { name: string; createdAt: string; updatedAt: string }
  viewport: { x: number; y: number; zoom: number }
  nodes: JamNode[]
  edges: JamEdge[]
}
