import { useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useJamStore } from '../store'
import type { JamDocument, JamNode, JamEdge } from '../types'

// 軽量オートセーブ: 変更を debounce して userData に退避。起動時に復元を確認。
export default function Autosave() {
  const nodes = useJamStore((s) => s.nodes)
  const edges = useJamStore((s) => s.edges)
  const filePath = useJamStore((s) => s.filePath)
  const loadSnapshot = useJamStore((s) => s.loadSnapshot)
  const setFilePath = useJamStore((s) => s.setFilePath)
  const rf = useReactFlow()
  const ready = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 起動時: 復帰データがあれば確認して復元
  useEffect(() => {
    let cancelled = false
    const run = async (): Promise<void> => {
      const api = window.jam
      if (api?.autosaveRead) {
        const rec = await api.autosaveRead()
        const recNodes = rec?.doc?.nodes
        if (!cancelled && rec && Array.isArray(recNodes) && recNodes.length > 0) {
          if (window.confirm('前回の続き（自動保存）を復元しますか？')) {
            loadSnapshot(recNodes as unknown as JamNode[], (rec.doc.edges ?? []) as unknown as JamEdge[])
            rf.setViewport(rec.doc.viewport ?? { x: 0, y: 0, zoom: 1 })
            setFilePath(rec.filePath ?? null)
          } else {
            await api.autosaveClear()
          }
        }
      }
      ready.current = true
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 変更を debounce して自動保存
  useEffect(() => {
    if (!ready.current || !window.jam?.autosaveWrite) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const now = new Date().toISOString()
      const doc: JamDocument = {
        version: 1,
        meta: { name: 'autosave', createdAt: now, updatedAt: now },
        viewport: rf.getViewport(),
        nodes,
        edges
      }
      void window.jam.autosaveWrite({ doc, filePath })
    }, 800)
    return () => clearTimeout(timer.current)
  }, [nodes, edges, filePath, rf])

  return null
}
