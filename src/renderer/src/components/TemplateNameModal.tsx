import { useEffect, useRef, useState } from 'react'
import { useJamStore } from '../store'

// テンプレート名の入力（Electron は window.prompt 非対応のため自前モーダル）
export default function TemplateNameModal() {
  const naming = useJamStore((s) => s.namingTemplate)
  const close = useJamStore((s) => s.closeTemplateNamer)
  const save = useJamStore((s) => s.saveSelectionAsTemplate)
  const count = useJamStore((s) => s.nodes.filter((n) => n.selected).length)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 開いたら確実にフォーカス（autoFocus は環境により不安定なので ref で）
  useEffect(() => {
    if (naming) {
      setName('')
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
    return undefined
  }, [naming])

  if (!naming) return null

  const commit = (): void => {
    const n = name.trim()
    if (n) save(n)
    close()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
      // バックドロップ「自身」を押した時だけ閉じる（入力内のクリック/ドラッグでは閉じない）
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="w-80 rounded-lg border border-jam-line bg-white p-4 shadow-xl">
        <p className="mb-1 font-hand text-sm font-bold text-jam-ink">テンプレート化</p>
        <p className="mb-2 text-xs text-jam-muted">選択中 {count} 個をマイテンプレートとして保存します。</p>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') close()
          }}
          placeholder="テンプレート名"
          className="w-full rounded border border-jam-line px-2 py-1 font-hand text-sm text-jam-ink outline-none focus:border-jam-ink"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded border border-jam-line px-3 py-1 font-hand text-sm text-jam-ink hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={!name.trim()}
            className="rounded border border-jam-ink bg-gray-100 px-3 py-1 font-hand text-sm text-jam-ink hover:bg-gray-200 disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
