import type { ReactNode } from 'react'
import { useJamStore } from '../store'

// キー表示用チップ
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-block rounded border border-jam-line bg-gray-100 px-1.5 py-0.5 text-[11px] leading-none text-jam-ink">
      {children}
    </kbd>
  )
}

function Row({ keys, desc }: { keys: ReactNode; desc: string }) {
  return (
    <div className="flex gap-3 py-1">
      <div className="flex w-44 shrink-0 flex-wrap items-center gap-1">{keys}</div>
      <div className="text-sm text-jam-ink">{desc}</div>
    </div>
  )
}

export default function HelpModal() {
  const open = useJamStore((s) => s.helpOpen)
  const setOpen = useJamStore((s) => s.setHelpOpen)
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="flex max-h-[85vh] w-[660px] max-w-full flex-col rounded-lg border border-jam-line bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-jam-line px-5 py-3">
          <h2 className="font-hand text-lg font-bold text-jam-ink">local-jam の使い方</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-1 text-jam-muted hover:text-jam-ink"
            title="閉じる"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-xs leading-relaxed text-jam-muted">
            ツールバーの各ボタンはマウスを乗せると名前が出ます。まずはパレットから部品をドラッグして置いてみてください。
          </p>

          <h3 className="mb-1 mt-2 text-sm font-bold text-jam-ink">基本操作・ショートカット</h3>
          <div className="divide-y divide-jam-line/40">
            <Row keys={<span className="text-xs text-jam-muted">パレットからドラッグ</span>} desc="部品を配置（画面フレームの上に落とすと中に吸着）" />
            <Row keys={<span className="text-xs text-jam-muted">ダブルクリック</span>} desc="編集（テキスト＝その場 / テーブル＝セル / 画像＝差し替え / その他＝右パネル）" />
            <Row keys={<Kbd>F2</Kbd>} desc="インスペクタ（右の詳細設定パネル）を開閉 ※単一選択時" />
            <Row keys={<span className="text-xs text-jam-muted">右クリック</span>} desc="メニュー（グループ化・整列・前面/背面・テンプレート化・削除 など）" />
            <Row
              keys={
                <>
                  <Kbd>Shift</Kbd>+<span className="text-xs text-jam-muted">ドラッグ</span>
                </>
              }
              desc="範囲選択（空白部分をドラッグ）"
            />
            <Row
              keys={
                <>
                  <Kbd>Shift</Kbd>+<span className="text-xs text-jam-muted">クリック</span>
                </>
              }
              desc="選択に追加 / 解除"
            />
            <Row keys={<><Kbd>Ctrl</Kbd>+<Kbd>C</Kbd> / <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd></>} desc="コピー / ペースト" />
            <Row keys={<><Kbd>Delete</Kbd> / <Kbd>Backspace</Kbd></>} desc="選択を削除" />
            <Row keys={<span className="text-xs text-jam-muted">ホイール / 空白ドラッグ</span>} desc="ズーム / 画面の移動（パン）" />
            <Row keys={<span className="text-xs text-jam-muted">画像ファイルをドラッグ</span>} desc="OSから画像をそのまま挿入" />
            <Row keys={<span className="text-xs text-jam-muted">近くの部品にそろえる</span>} desc="ピンクのガイドで自動整列（吸着）" />
          </div>

          <h3 className="mb-1 mt-4 text-sm font-bold text-jam-ink">テンプレート（配布・共有）</h3>
          <div className="divide-y divide-jam-line/40">
            <Row keys={<span className="text-xs text-jam-muted">複数選択 → 右クリック</span>} desc="「テンプレート化」でマイテンプレートに保存" />
            <Row keys={<span className="text-xs text-jam-muted">マイテンプレートの ⬇ / ＋</span>} desc="⬇ 書き出し（.ljat）/ ＋ 取り込み で配布・共有" />
          </div>

          <h3 className="mb-1 mt-4 text-sm font-bold text-jam-ink">Claude 連携（MCP・読み取り専用）</h3>
          <p className="mb-2 text-xs leading-relaxed text-jam-muted">
            アプリ起動中、いまのキャンバスを Claude が読み取れます（プル型：Claude が必要なときに読む）。
          </p>
          <div className="rounded border border-jam-line bg-gray-50 p-3 text-sm text-jam-ink">
            <p className="mb-1">
              エンドポイント：<code className="rounded bg-white px-1 text-xs">http://127.0.0.1:4319/mcp</code>
            </p>
            <p className="mb-1">接続（Claude Code・ターミナルで一度だけ）：</p>
            <pre className="mb-2 overflow-x-auto rounded bg-white px-2 py-1 text-xs">
              claude mcp add -t http local-jam http://127.0.0.1:4319/mcp
            </pre>
            <p className="mb-1 text-xs text-jam-muted">
              ※ 登録後、<b>新しい Claude Code インスタンス</b>で有効になります。
            </p>
            <p className="text-xs">
              ツール：<b>describe_layout</b>（画面構成の要約）/ <b>get_document</b>（完全なJSON）。
              <br />
              例：「local-jam の describe_layout を読んで、この機能の画面案を出して」
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-jam-line px-5 py-2 text-right">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-jam-ink bg-gray-100 px-3 py-1 font-hand text-sm text-jam-ink hover:bg-gray-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
