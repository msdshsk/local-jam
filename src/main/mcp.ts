// 最小の MCP over HTTP (Streamable HTTP / JSON-RPC 2.0)。読み取り専用。
// initialize / tools/list / tools/call(describe_layout, get_document) / ping のみ対応。
import { createServer, type Server } from 'node:http'
import { describeLayout } from './describeLayout'

const SERVER_INFO = { name: 'local-jam', version: '0.0.1' }
const DEFAULT_PROTOCOL = '2025-06-18'

// main 側が保持する最新スナップショット { doc, filePath } を返す関数
export type GetSnapshot = () => unknown

interface RpcMsg {
  jsonrpc?: string
  id?: string | number
  method?: string
  params?: Record<string, unknown>
}

const TOOLS = [
  {
    name: 'describe_layout',
    description:
      '現在の local-jam ボードの画面構成を、画面ごと・上から順の部品一覧として要約したテキストを返す。まずこれを読めば全体像（どの画面に何の部品がどう並ぶか）が分かる。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'get_document',
    description:
      '現在のボードの完全なドキュメントJSON(nodes/edges/viewport/meta)を返す。厳密な座標やデータが必要な時に使う。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  }
]

function ok(id: RpcMsg['id'], result: unknown): object {
  return { jsonrpc: '2.0', id, result }
}
function err(id: RpcMsg['id'], code: number, message: string): object {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

// スナップショット { doc, ... } から doc 本体を取り出す（doc直渡しにも耐える）
function extractDoc(snapshot: unknown): unknown {
  if (snapshot && typeof snapshot === 'object') {
    const s = snapshot as Record<string, unknown>
    if (s.doc) return s.doc
    if (Array.isArray(s.nodes)) return s
  }
  return null
}

function textResult(id: RpcMsg['id'], text: string, isError = false): object {
  return ok(id, { content: [{ type: 'text', text }], isError })
}

export function handleMcp(msg: RpcMsg, getSnapshot: GetSnapshot): object | null {
  const { id, method, params } = msg
  // 通知（idなし）には応答しない
  if (id === undefined) return null

  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: (params?.protocolVersion as string) || DEFAULT_PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO
      })
    case 'ping':
      return ok(id, {})
    case 'tools/list':
      return ok(id, { tools: TOOLS })
    case 'tools/call': {
      const name = params?.name as string
      const doc = extractDoc(getSnapshot())
      if (name === 'describe_layout') {
        if (!doc) return textResult(id, '（まだボードのデータがありません。アプリで何か配置・保存してください）')
        return textResult(id, describeLayout(doc as never))
      }
      if (name === 'get_document') {
        if (!doc) return textResult(id, '（まだボードのデータがありません）')
        return textResult(id, JSON.stringify(doc, null, 2))
      }
      return textResult(id, `unknown tool: ${name}`, true)
    }
    default:
      return err(id, -32601, `Method not found: ${method}`)
  }
}

export function createMcpServer(getSnapshot: GetSnapshot): Server {
  return createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id, mcp-protocol-version, authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    // GET（サーバ起点SSE）は未対応。POSTのみ。
    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end()
      return
    }

    let body = ''
    req.on('data', (c) => {
      body += c
      if (body.length > 4_000_000) req.destroy() // 念のため上限
    })
    req.on('end', () => {
      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(err(undefined as never, -32700, 'Parse error')))
        return
      }
      const batch = Array.isArray(parsed) ? (parsed as RpcMsg[]) : [parsed as RpcMsg]
      const responses = batch.map((m) => handleMcp(m, getSnapshot)).filter((r): r is object => r !== null)
      if (responses.length === 0) {
        res.writeHead(202) // 通知のみ → 本文なし
        res.end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(Array.isArray(parsed) ? responses : responses[0]))
    })
  })
}
