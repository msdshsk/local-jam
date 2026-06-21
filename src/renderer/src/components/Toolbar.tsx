import { useEffect, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useJamStore } from '../store'
import { loadImageDims, fitSize } from '../imageUtil'
import { exportPng, exportPdf } from '../exportImage'
import type { JamDocument } from '../types'

// この幅未満になったら編集系を「編集 ▾」に畳む（インライン全部が収まる幅を確保）
const COLLAPSE_WIDTH = 1520

type Act =
  | { type: 'sep' }
  | {
      type: 'btn'
      key: string
      label: string
      full?: string
      title?: string
      onClick: () => void
      enabled: boolean
      danger?: boolean
    }

export default function Toolbar() {
  const addFrame = useJamStore((s) => s.addFrame)
  const groupSelected = useJamStore((s) => s.groupSelected)
  const ungroupSelected = useJamStore((s) => s.ungroupSelected)
  const bringToFront = useJamStore((s) => s.bringToFrontSelected)
  const sendToBack = useJamStore((s) => s.sendToBackSelected)
  const scaleSelected = useJamStore((s) => s.scaleSelected)
  const alignSelected = useJamStore((s) => s.alignSelected)
  const connectSelected = useJamStore((s) => s.connectSelected)
  const saveSelectionAsTemplate = useJamStore((s) => s.saveSelectionAsTemplate)
  const deleteSelected = useJamStore((s) => s.deleteSelected)
  const nodes = useJamStore((s) => s.nodes)
  const edges = useJamStore((s) => s.edges)
  const loadSnapshot = useJamStore((s) => s.loadSnapshot)
  const newDocument = useJamStore((s) => s.newDocument)
  const filePath = useJamStore((s) => s.filePath)
  const setFilePath = useJamStore((s) => s.setFilePath)
  const notesVisible = useJamStore((s) => s.notesVisible)
  const toggleNotesVisible = useJamStore((s) => s.toggleNotesVisible)
  const addImage = useJamStore((s) => s.addImage)
  const rf = useReactFlow()

  const fileName = filePath ? (filePath.split(/[\\/]/).pop() ?? '') : '未保存'

  const [narrow, setNarrow] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const check = (): void => setNarrow(window.innerWidth < COLLAPSE_WIDTH)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const selected = nodes.filter((n) => n.selected)
  const groupCount = selected.filter((n) => n.type === 'jgroup').length
  const partCount = selected.filter((n) => n.type === 'part').length
  const alignable = selected.filter((n) => n.type !== 'screen').length
  const canGroup = partCount >= 2
  const canUngroup = groupCount >= 1
  const canZ = selected.length >= 1
  const canScale = partCount >= 1
  const canDelete = selected.length >= 1
  const canAlign = alignable >= 2
  const canDist = alignable >= 3
  const canConnect = selected.length === 2
  const canTemplate = selected.length >= 1

  const buildDoc = (): JamDocument => {
    const now = new Date().toISOString()
    return {
      version: 1,
      meta: { name: fileName, createdAt: now, updatedAt: now },
      viewport: rf.getViewport(),
      nodes,
      edges
    }
  }
  const onSave = async (): Promise<void> => {
    if (!window.jam) return
    if (filePath) {
      await window.jam.saveDocumentTo(filePath, buildDoc())
      await window.jam.autosaveClear()
    } else {
      const p = await window.jam.saveDocumentAs(buildDoc())
      if (p) {
        setFilePath(p)
        await window.jam.autosaveClear()
      }
    }
  }
  const onSaveAs = async (): Promise<void> => {
    if (!window.jam) return
    const p = await window.jam.saveDocumentAs(buildDoc())
    if (p) {
      setFilePath(p)
      await window.jam.autosaveClear()
    }
  }
  const onOpen = async (): Promise<void> => {
    if (!window.jam) return
    const r = await window.jam.openDocument()
    if (!r) return
    const doc = r.doc as JamDocument
    loadSnapshot(doc.nodes ?? [], doc.edges ?? [])
    rf.setViewport(doc.viewport ?? { x: 0, y: 0, zoom: 1 })
    setFilePath(r.path)
  }
  const onNew = (): void => {
    if (nodes.length > 0 && !window.confirm('現在の内容を破棄して新規作成しますか？')) return
    newDocument()
  }
  const onAddFrame = (): void => {
    const c = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    addFrame({ x: c.x - 720, y: c.y - 512 })
  }

  const onInsertImage = async (): Promise<void> => {
    if (!window.jam?.pickImage) return
    const src = await window.jam.pickImage()
    if (!src) return
    const dim = await loadImageDims(src)
    const fit = fitSize(dim.w, dim.h)
    const c = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    addImage(src, { x: c.x - fit.w / 2, y: c.y - fit.h / 2 }, fit.w, fit.h)
  }

  // 書き出し（PNG/PDF）
  const baseName = (): string => {
    const n = filePath ? (filePath.split(/[\\/]/).pop() ?? 'board') : 'board'
    return n.replace(/\.ljam$/i, '')
  }
  const savePng = async (selectionOnly: boolean): Promise<void> => {
    if (!window.jam || busy) return
    setBusy(true)
    try {
      const dataUrl = await exportPng(rf, selectionOnly)
      if (!dataUrl) {
        window.alert('書き出す対象がありません。')
        return
      }
      await window.jam.exportSave({
        defaultPath: `${baseName()}.png`,
        base64: dataUrl.split(',')[1],
        filters: [{ name: 'PNG画像', extensions: ['png'] }]
      })
    } finally {
      setBusy(false)
    }
  }
  const savePdf = async (perScreen: boolean): Promise<void> => {
    if (!window.jam || busy) return
    setBusy(true)
    try {
      const base64 = await exportPdf(rf, perScreen)
      if (!base64) {
        window.alert('書き出す対象がありません。')
        return
      }
      await window.jam.exportSave({
        defaultPath: `${baseName()}.pdf`,
        base64,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      })
    } finally {
      setBusy(false)
    }
  }
  const hasSelection = selected.length >= 1
  const hasScreen = nodes.some((n) => n.type === 'screen')

  const base = 'shrink-0 whitespace-nowrap rounded border px-2.5 py-1 font-hand text-sm '
  const on = 'border-jam-ink bg-gray-100 text-jam-ink hover:bg-gray-200'
  const off = 'border-jam-line bg-gray-50 text-jam-line cursor-not-allowed'
  const danger = 'border-red-400 bg-red-50 text-red-600 hover:bg-red-100'

  // 編集系アクション（インライン表示／畳んだ時のドロップダウンで共用）
  const acts: Act[] = [
    { type: 'btn', key: 'group', label: 'グループ化', onClick: groupSelected, enabled: canGroup },
    { type: 'btn', key: 'ungroup', label: '解除', full: 'グループ解除', onClick: ungroupSelected, enabled: canUngroup },
    { type: 'sep' },
    { type: 'btn', key: 'front', label: '最前面', onClick: bringToFront, enabled: canZ },
    { type: 'btn', key: 'back', label: '最背面', onClick: sendToBack, enabled: canZ },
    { type: 'sep' },
    { type: 'btn', key: 'big', label: '大きく', onClick: () => scaleSelected(1.1), enabled: canScale },
    { type: 'btn', key: 'small', label: '小さく', onClick: () => scaleSelected(1 / 1.1), enabled: canScale },
    { type: 'sep' },
    { type: 'btn', key: 'al', label: '⬅', full: '左揃え', title: '左揃え', onClick: () => alignSelected('left'), enabled: canAlign },
    { type: 'btn', key: 'ar', label: '➡', full: '右揃え', title: '右揃え', onClick: () => alignSelected('right'), enabled: canAlign },
    { type: 'btn', key: 'at', label: '⬆', full: '上揃え', title: '上揃え', onClick: () => alignSelected('top'), enabled: canAlign },
    { type: 'btn', key: 'ab', label: '⬇', full: '下揃え', title: '下揃え', onClick: () => alignSelected('bottom'), enabled: canAlign },
    { type: 'btn', key: 'dh', label: '⇿', full: '水平等間隔', title: '水平等間隔', onClick: () => alignSelected('distH'), enabled: canDist },
    { type: 'btn', key: 'dv', label: '⇳', full: '垂直等間隔', title: '垂直等間隔', onClick: () => alignSelected('distV'), enabled: canDist },
    { type: 'sep' },
    { type: 'btn', key: 'connect', label: '🔗', full: '線でつなぐ', title: '線でつなぐ', onClick: connectSelected, enabled: canConnect },
    { type: 'sep' },
    {
      type: 'btn',
      key: 'tpl',
      label: 'テンプレ化',
      full: 'テンプレート化',
      title: '選択をテンプレート化',
      onClick: () => {
        const n = window.prompt('テンプレート名を入力')
        if (n) saveSelectionAsTemplate(n)
      },
      enabled: canTemplate
    },
    { type: 'sep' },
    { type: 'btn', key: 'del', label: '削除', onClick: deleteSelected, enabled: canDelete, danger: true }
  ]

  const dropItem =
    'block w-full px-3 py-1.5 text-left font-hand text-sm text-jam-ink hover:bg-gray-100 disabled:text-jam-line disabled:hover:bg-transparent'

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-jam-line bg-white px-3">
      <span className="font-hand text-base font-bold text-jam-ink">local-jam</span>
      <button type="button" onClick={onNew} className={base + on}>
        新規
      </button>
      <button type="button" onClick={onOpen} className={base + on}>
        開く
      </button>
      <button type="button" onClick={onSave} className={base + on}>
        保存
      </button>
      <button type="button" onClick={onSaveAs} className={base + on}>
        別名保存
      </button>
      <span className="max-w-[140px] shrink-0 truncate text-xs text-jam-muted" title={filePath ?? '未保存'}>
        {fileName}
      </span>

      <div className="relative">
        <button type="button" onClick={() => setExportOpen((o) => !o)} className={base + on} disabled={busy}>
          {busy ? '書き出し中…' : '書き出し ▾'}
        </button>
        {exportOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-jam-line bg-white py-1 shadow-lg">
              <button
                type="button"
                className={dropItem}
                onClick={() => {
                  setExportOpen(false)
                  void savePng(false)
                }}
              >
                PNG（ボード全体）
              </button>
              <button
                type="button"
                disabled={!hasSelection}
                className={dropItem}
                onClick={() => {
                  setExportOpen(false)
                  void savePng(true)
                }}
              >
                PNG（選択範囲）
              </button>
              <hr className="my-1 border-jam-line/50" />
              <button
                type="button"
                className={dropItem}
                onClick={() => {
                  setExportOpen(false)
                  void savePdf(false)
                }}
              >
                PDF（ボード全体・1枚）
              </button>
              <button
                type="button"
                disabled={!hasScreen}
                className={dropItem}
                onClick={() => {
                  setExportOpen(false)
                  void savePdf(true)
                }}
              >
                PDF（画面ごと・複数ページ）
              </button>
            </div>
          </>
        )}
      </div>

      <span className="mx-1 h-5 w-px shrink-0 bg-jam-line" />
      <button type="button" onClick={onAddFrame} className={base + on}>
        ＋ 空フレーム
      </button>
      <button type="button" onClick={toggleNotesVisible} className={base + on} title="メモ・コメントの表示切替">
        {notesVisible ? 'メモ非表示' : 'メモ表示'}
      </button>
      <button type="button" onClick={onInsertImage} className={base + on} title="画像ファイルを挿入">
        画像挿入
      </button>
      <span className="mx-1 h-5 w-px shrink-0 bg-jam-line" />

      {!narrow &&
        acts.map((a, i) =>
          a.type === 'sep' ? (
            <span key={'s' + i} className="mx-1 h-5 w-px shrink-0 bg-jam-line" />
          ) : (
            <button
              key={a.key}
              type="button"
              title={a.title}
              onClick={a.onClick}
              disabled={!a.enabled}
              className={base + (a.enabled ? (a.danger ? danger : on) : off)}
            >
              {a.label}
            </button>
          )
        )}

      {narrow && (
        <div className="relative">
          <button type="button" onClick={() => setEditOpen((o) => !o)} className={base + on}>
            編集 ▾
          </button>
          {editOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setEditOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-jam-line bg-white py-1 shadow-lg">
                {acts.map((a, i) =>
                  a.type === 'sep' ? (
                    <hr key={'s' + i} className="my-1 border-jam-line/50" />
                  ) : (
                    <button
                      key={a.key}
                      type="button"
                      disabled={!a.enabled}
                      onClick={() => {
                        a.onClick()
                        setEditOpen(false)
                      }}
                      className={dropItem + (a.danger && a.enabled ? ' text-red-600' : '')}
                    >
                      {a.full ?? a.label}
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex-1" />
    </div>
  )
}
