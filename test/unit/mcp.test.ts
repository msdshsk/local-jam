import { describe, it, expect } from 'vitest'
import type { AddressInfo } from 'node:net'
import { handleMcp, createMcpServer } from '../../src/main/mcp'

const snap = {
  doc: {
    meta: { name: 'm.ljam' },
    edges: [],
    nodes: [{ id: 'b', type: 'part', position: { x: 0, y: 0 }, width: 100, height: 40, data: { partType: 'button', label: 'OK' } }]
  }
}
const getSnap = (): unknown => snap

// レスポンスを型ゆるく扱うヘルパ
const r = (o: object | null): Record<string, unknown> => o as Record<string, unknown>

describe('handleMcp（MCP JSON-RPC）', () => {
  it('initialize は serverInfo と protocolVersion を返す', () => {
    const res = r(handleMcp({ id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, getSnap))
    const result = res.result as { protocolVersion: string; serverInfo: { name: string }; capabilities: { tools: unknown } }
    expect(result.serverInfo.name).toBe('local-jam')
    expect(result.protocolVersion).toBe('2025-06-18')
    expect(result.capabilities.tools).toBeDefined()
  })

  it('tools/list は2ツールを返す', () => {
    const res = r(handleMcp({ id: 2, method: 'tools/list' }, getSnap))
    const tools = (res.result as { tools: { name: string }[] }).tools.map((t) => t.name)
    expect(tools).toEqual(['describe_layout', 'get_document'])
  })

  it('tools/call describe_layout は要約テキストを返す', () => {
    const res = r(handleMcp({ id: 3, method: 'tools/call', params: { name: 'describe_layout' } }, getSnap))
    const text = (res.result as { content: { text: string }[] }).content[0].text
    expect(text).toContain('ボタン「OK」')
  })

  it('tools/call get_document は nodes を含むJSON', () => {
    const res = r(handleMcp({ id: 4, method: 'tools/call', params: { name: 'get_document' } }, getSnap))
    const text = (res.result as { content: { text: string }[] }).content[0].text
    expect(text).toContain('"nodes"')
    expect(() => JSON.parse(text)).not.toThrow()
  })

  it('通知（idなし）には応答しない', () => {
    expect(handleMcp({ method: 'notifications/initialized' }, getSnap)).toBeNull()
  })

  it('未知メソッドは -32601', () => {
    const res = r(handleMcp({ id: 9, method: 'nope/x' }, getSnap))
    expect((res.error as { code: number }).code).toBe(-32601)
  })

  it('データ未取得でも describe_layout は落ちない', () => {
    const res = r(handleMcp({ id: 5, method: 'tools/call', params: { name: 'describe_layout' } }, () => null))
    const text = (res.result as { content: { text: string }[] }).content[0].text
    expect(typeof text).toBe('string')
  })

  // 回帰: ポート競合(EADDRINUSE)は throw でなく 'error' イベントで飛ぶ。
  // index.ts は 'error' を拾ってアプリ本体を起動させ続ける（未捕捉例外ダイアログを出さない）。
  it('ポート使用中の listen は throw せず error イベントで EADDRINUSE を通知する', async () => {
    const s1 = createMcpServer(() => null)
    await new Promise<void>((resolve) => s1.listen(0, '127.0.0.1', resolve))
    const port = (s1.address() as AddressInfo).port

    const s2 = createMcpServer(() => null)
    const code = await new Promise<string | undefined>((resolve) => {
      s2.on('error', (e: NodeJS.ErrnoException) => resolve(e.code))
      // 同期 throw されない（されたらこの呼び出しで例外＝テスト失敗）
      s2.listen(port, '127.0.0.1', () => resolve('LISTENED'))
    })
    expect(code).toBe('EADDRINUSE')

    await new Promise<void>((resolve) => s1.close(() => resolve()))
    await new Promise<void>((resolve) => s2.close(() => resolve()))
  })
})
