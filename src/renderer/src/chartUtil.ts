// グラフ部品の純ロジック（単体テスト対象）。

// "30,70,45" のようなカンマ区切り文字列を数値配列へ。空/不正は fallback。
// 全角数字(０-９)・全角/和文カンマ(，、)・空白も区切りとして許容（IME入力対策）。
export function parseNums(s: string | undefined, fallback: number[]): number[] {
  if (!s) return fallback
  const normalized = s
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[，、\s]/g, ',')
  const arr = normalized
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .map(Number)
    .filter((v) => !Number.isNaN(v))
  return arr.length ? arr : fallback
}

// 円グラフ: 各値の扇形パス(viewBox 0 0 100 100, 中心50,50, 半径45)を返す
export function piePaths(vals: number[]): string[] {
  const total = vals.reduce((a, b) => a + b, 0) || 1
  const cx = 50
  const cy = 50
  const r = 45
  let acc = -Math.PI / 2
  return vals.map((v) => {
    const ang = (v / total) * Math.PI * 2
    const x1 = cx + r * Math.cos(acc)
    const y1 = cy + r * Math.sin(acc)
    acc += ang
    const x2 = cx + r * Math.cos(acc)
    const y2 = cy + r * Math.sin(acc)
    const large = ang > Math.PI ? 1 : 0
    return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
  })
}
