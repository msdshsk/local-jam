import { describe, it, expect } from 'vitest'
import { fitSize } from '../../src/renderer/src/imageUtil'

describe('fitSize（画像の縮小フィット）', () => {
  it('最大辺を超えない比率で縮小（横長）', () => {
    expect(fitSize(640, 320, 320)).toEqual({ w: 320, h: 160 })
  })
  it('縦長も最大辺基準', () => {
    expect(fitSize(200, 800, 400)).toEqual({ w: 100, h: 400 })
  })
  it('最大辺以下なら拡大しない', () => {
    expect(fitSize(100, 80, 320)).toEqual({ w: 100, h: 80 })
  })
  it('最小1pxを保証', () => {
    const r = fitSize(1, 1, 320)
    expect(r.w).toBeGreaterThanOrEqual(1)
    expect(r.h).toBeGreaterThanOrEqual(1)
  })
})
