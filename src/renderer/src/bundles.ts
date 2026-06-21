import type { PartType, PartData } from './types'

// バンドル＝「置くとアトム群に展開される束」。座標は bbox 左上(0,0)からの px オフセット。
export interface BundleAtom {
  type: PartType
  dx: number
  dy: number
  w: number
  h: number
  data?: Partial<PartData>
}

export interface BundleDef {
  id: string
  name: string
  tier: 'micro' | 'structure' | 'feature' | 'frame'
  atoms: BundleAtom[]
}

export const BUNDLES: BundleDef[] = [
  {
    id: 'label-input',
    name: 'ラベル＋入力',
    tier: 'micro',
    atoms: [
      { type: 'label', dx: 0, dy: 0, w: 160, h: 22, data: { label: '項目名' } },
      { type: 'input', dx: 0, dy: 26, w: 240, h: 40, data: { placeholder: '入力してください' } }
    ]
  },
  {
    id: 'label-select',
    name: 'ラベル＋セレクト',
    tier: 'micro',
    atoms: [
      { type: 'label', dx: 0, dy: 0, w: 160, h: 22, data: { label: '項目名' } },
      { type: 'select', dx: 0, dy: 26, w: 240, h: 40, data: { options: ['選択肢1', '選択肢2'] } }
    ]
  },
  {
    id: 'save-cancel',
    name: '保存・キャンセル',
    tier: 'micro',
    atoms: [
      { type: 'button', dx: 0, dy: 0, w: 110, h: 40, data: { label: '保存' } },
      { type: 'button', dx: 122, dy: 0, w: 120, h: 40, data: { label: 'キャンセル' } }
    ]
  },
  {
    id: 'search-bar',
    name: '検索バー',
    tier: 'micro',
    atoms: [
      { type: 'input', dx: 0, dy: 0, w: 260, h: 40, data: { placeholder: '検索' } },
      { type: 'button', dx: 268, dy: 0, w: 90, h: 40, data: { label: '検索' } }
    ]
  },
  {
    id: 'login-form',
    name: 'ログインフォーム',
    tier: 'feature',
    atoms: [
      { type: 'heading', dx: 0, dy: 0, w: 300, h: 32, data: { label: 'ログイン' } },
      { type: 'input', dx: 0, dy: 44, w: 300, h: 44, data: { placeholder: 'メールアドレス', type: 'email' } },
      { type: 'input', dx: 0, dy: 96, w: 300, h: 44, data: { placeholder: 'パスワード', type: 'password' } },
      { type: 'button', dx: 0, dy: 152, w: 300, h: 44, data: { label: 'ログイン' } },
      { type: 'link', dx: 0, dy: 208, w: 220, h: 22, data: { label: 'パスワードをお忘れですか？' } }
    ]
  },
  {
    id: 'signup-form',
    name: '新規登録フォーム',
    tier: 'feature',
    atoms: [
      { type: 'heading', dx: 0, dy: 0, w: 300, h: 32, data: { label: '新規登録' } },
      { type: 'input', dx: 0, dy: 44, w: 300, h: 44, data: { placeholder: 'お名前' } },
      { type: 'input', dx: 0, dy: 96, w: 300, h: 44, data: { placeholder: 'メールアドレス', type: 'email' } },
      { type: 'input', dx: 0, dy: 148, w: 300, h: 44, data: { placeholder: 'パスワード', type: 'password' } },
      { type: 'input', dx: 0, dy: 200, w: 300, h: 44, data: { placeholder: 'パスワード（確認）', type: 'password' } },
      { type: 'button', dx: 0, dy: 256, w: 300, h: 44, data: { label: '登録する' } },
      { type: 'link', dx: 0, dy: 312, w: 280, h: 22, data: { label: '既にアカウントをお持ちの方はこちら' } }
    ]
  },
  {
    id: 'password-reset',
    name: 'パスワード再設定',
    tier: 'feature',
    atoms: [
      { type: 'heading', dx: 0, dy: 0, w: 300, h: 32, data: { label: 'パスワード再設定' } },
      { type: 'label', dx: 0, dy: 42, w: 300, h: 22, data: { label: '登録メールアドレスに再設定リンクを送ります' } },
      { type: 'input', dx: 0, dy: 72, w: 300, h: 44, data: { placeholder: 'メールアドレス', type: 'email' } },
      { type: 'button', dx: 0, dy: 128, w: 300, h: 44, data: { label: '再設定メールを送信' } }
    ]
  },
  {
    id: 'chat-thread',
    name: 'チャット会話',
    tier: 'feature',
    atoms: [
      { type: 'bubble', dx: 0, dy: 0, w: 340, h: 64, data: { body: 'ご質問をどうぞ。\n何でもお答えします。', on: false } },
      { type: 'bubble', dx: 0, dy: 72, w: 340, h: 44, data: { body: 'プランの作り方を教えて', on: true } },
      { type: 'bubble', dx: 0, dy: 124, w: 340, h: 64, data: { body: '目的を決め → 項目に分解 →\n画面に配置、の順がおすすめです。', on: false } },
      { type: 'bubble', dx: 0, dy: 196, w: 340, h: 44, data: { body: 'なるほど、やってみます！', on: true } },
      { type: 'chatinput', dx: 0, dy: 252, w: 340, h: 56, data: { placeholder: 'メッセージを入力…' } }
    ]
  },
  {
    id: 'data-form',
    name: '入力フォーム',
    tier: 'feature',
    atoms: [
      { type: 'label', dx: 0, dy: 0, w: 160, h: 22, data: { label: '氏名' } },
      { type: 'input', dx: 0, dy: 26, w: 300, h: 40, data: { placeholder: '山田 太郎' } },
      { type: 'label', dx: 0, dy: 78, w: 160, h: 22, data: { label: 'メール' } },
      { type: 'input', dx: 0, dy: 104, w: 300, h: 40, data: { placeholder: 'mail@example.com' } },
      { type: 'label', dx: 0, dy: 156, w: 160, h: 22, data: { label: '区分' } },
      { type: 'select', dx: 0, dy: 182, w: 300, h: 40, data: { options: ['区分A', '区分B'] } },
      { type: 'button', dx: 0, dy: 240, w: 110, h: 40, data: { label: '保存' } },
      { type: 'button', dx: 122, dy: 240, w: 120, h: 40, data: { label: 'キャンセル' } }
    ]
  }
]

export function getBundle(id: string): BundleDef | undefined {
  return BUNDLES.find((b) => b.id === id)
}
