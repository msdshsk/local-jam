import { describe, it, expect } from 'vitest'
import { normalizeCells } from '../../src/renderer/src/tableUtil'

describe('normalizeCells（テーブル正規化）', () => {
  it('不足セルは空文字で埋める', () => {
    expect(normalizeCells(2, 2)).toEqual([
      ['', ''],
      ['', '']
    ])
  })
  it('既存値を保持しつつ rows×cols に整える', () => {
    expect(normalizeCells(2, 2, [['a', 'b', 'c']])).toEqual([
      ['a', 'b'],
      ['', '']
    ])
  })
  it('超過行/列は切り詰める', () => {
    const cells = [
      ['1', '2'],
      ['3', '4'],
      ['5', '6']
    ]
    expect(normalizeCells(1, 2, cells)).toEqual([['1'], ['3']])
  })
})
