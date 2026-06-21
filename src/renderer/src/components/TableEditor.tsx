import { useJamStore } from '../store'
import { normalizeCells } from '../tableUtil'

// テーブルのセル編集モーダル（自作の軽量グリッド）
export default function TableEditor() {
  const id = useJamStore((s) => s.editingTableId)
  const nodes = useJamStore((s) => s.nodes)
  const updateTable = useJamStore((s) => s.updateTable)
  const close = useJamStore((s) => s.closeTableEditor)

  if (!id) return null
  const node = nodes.find((n) => n.id === id)
  if (!node || node.type !== 'part') return null

  const cols = node.data.columns ?? ['列1']
  const rows = node.data.rows ?? 0
  const cells = normalizeCells(cols.length, rows, node.data.cells)

  const setHeader = (c: number, v: string): void => {
    const nc = [...cols]
    nc[c] = v
    updateTable(id, { columns: nc })
  }
  const setCell = (r: number, c: number, v: string): void => {
    const nce = cells.map((row) => [...row])
    nce[r][c] = v
    updateTable(id, { cells: nce })
  }

  const btn =
    'rounded border border-jam-line bg-gray-50 px-2 py-0.5 font-hand text-sm text-jam-ink hover:bg-gray-100'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
      onClick={close}
    >
      <div
        className="flex max-h-[80vh] w-[min(90vw,720px)] flex-col rounded-lg border border-jam-line bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-hand text-base font-bold text-jam-ink">テーブル編集</h2>
          <button type="button" onClick={close} className={btn}>
            閉じる
          </button>
        </div>
        <div className="mb-2 flex items-center gap-2">
          <button type="button" onClick={() => updateTable(id, { rows: rows + 1 })} className={btn}>
            ＋行
          </button>
          <button
            type="button"
            onClick={() => updateTable(id, { rows: Math.max(0, rows - 1) })}
            className={btn}
          >
            －行
          </button>
          <button
            type="button"
            onClick={() => updateTable(id, { columns: [...cols, '列' + (cols.length + 1)] })}
            className={btn}
          >
            ＋列
          </button>
          <button
            type="button"
            onClick={() => updateTable(id, { columns: cols.slice(0, Math.max(1, cols.length - 1)) })}
            className={btn}
          >
            －列
          </button>
          <span className="ml-2 text-xs text-jam-muted">
            {rows} 行 × {cols.length} 列
          </span>
        </div>
        <div className="overflow-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                {cols.map((h, c) => (
                  <th key={c} className="border border-jam-line p-0">
                    <input
                      value={h}
                      onChange={(e) => setHeader(c, e.target.value)}
                      className="w-32 bg-gray-50 px-2 py-1 font-hand text-sm font-bold text-jam-ink outline-none"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cells.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border border-jam-line p-0">
                      <input
                        value={cell}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        className="w-32 px-2 py-1 font-hand text-sm text-jam-ink outline-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
