// 画像の自然サイズを取得（失敗時は既定）
export function loadImageDims(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth || 240, h: img.naturalHeight || 180 })
    img.onerror = () => resolve({ w: 240, h: 180 })
    img.src = src
  })
}

// 最大辺 max に収まるよう縮小（拡大はしない）
export function fitSize(w: number, h: number, max = 320): { w: number; h: number } {
  const scale = Math.min(1, max / Math.max(w, h, 1))
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) }
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(file)
  })
}
