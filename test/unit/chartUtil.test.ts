import { describe, it, expect } from 'vitest'
import { parseNums, piePaths } from '../../src/renderer/src/chartUtil'

describe('parseNums（グラフ値の解釈）', () => {
  const fb = [1]
  it('半角カンマ区切り', () => expect(parseNums('30,70,45', fb)).toEqual([30, 70, 45]))
  it('全角カンマ（IME）', () => expect(parseNums('30，70，45', fb)).toEqual([30, 70, 45]))
  it('和文カンマ（IME）', () => expect(parseNums('30、70、45', fb)).toEqual([30, 70, 45]))
  it('全角数字', () => expect(parseNums('３０，７０', fb)).toEqual([30, 70]))
  it('空白区切り', () => expect(parseNums('30 70 45', fb)).toEqual([30, 70, 45]))
  it('末尾/連続カンマで0が混入しない', () => {
    expect(parseNums('30, 70, ', fb)).toEqual([30, 70])
    expect(parseNums('12,,,8', fb)).toEqual([12, 8])
  })
  it('空/不正は fallback', () => {
    expect(parseNums('', fb)).toEqual(fb)
    expect(parseNums('   ', fb)).toEqual(fb)
    expect(parseNums('abc', fb)).toEqual(fb)
    expect(parseNums(undefined, fb)).toEqual(fb)
  })
})

describe('piePaths（円グラフの扇形）', () => {
  it('値の数だけパスを返す', () => expect(piePaths([1, 1, 1, 1]).length).toBe(4))
  it('各パスは中心からの扇形コマンド', () => {
    for (const d of piePaths([3, 2])) {
      expect(d).toMatch(/^M 50 50 L/)
      expect(d).toContain('A 45 45')
    }
  })
})
