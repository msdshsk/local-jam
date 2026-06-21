// テーブルのセル配列を rows×cols に正規化（不足は空文字、超過は切り詰め）
export function normalizeCells(cols: number, rows: number, cells?: string[][]): string[][] {
  const out: string[][] = []
  for (let r = 0; r < rows; r++) {
    const row: string[] = []
    for (let c = 0; c < cols; c++) row.push(cells?.[r]?.[c] ?? '')
    out.push(row)
  }
  return out
}
