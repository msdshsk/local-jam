import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile, rm, mkdir, readdir, rename, copyFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { createMcpServer } from './mcp'
import { packTemplate, unpackTemplate, readMeta } from './ljat'

// MCP(読み取り専用)に渡す最新スナップショット { doc, filePath }。オートセーブ payload を流用。
let latestSnapshot: unknown = null
const MCP_PORT = 4319

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    title: 'local-jam',
    backgroundColor: '#f3f4f6',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  // electron-vite が dev 時にこの環境変数へレンダラURLを入れる
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    win.loadURL(rendererUrl)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// .ljam = ZIPパッケージ（mimetype + document.json [+ 将来 resources/]）
async function writeLjam(filePath: string, doc: unknown): Promise<void> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/x-local-jam')
  zip.file('document.json', JSON.stringify(doc))
  const buf = await zip.generateAsync({ type: 'nodebuffer' })
  await writeFile(filePath, buf)
}

function registerIpc(): void {
  // 名前を付けて保存（ダイアログあり）
  ipcMain.handle('doc:saveAs', async (_e, doc: unknown) => {
    const win = BrowserWindow.getFocusedWindow()
    const opts: Electron.SaveDialogOptions = {
      title: '名前を付けて保存',
      defaultPath: 'untitled.ljam',
      filters: [{ name: 'local-jam', extensions: ['ljam'] }]
    }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return null
    await writeLjam(res.filePath, doc)
    return res.filePath
  })

  // 上書き保存（ダイアログなし）
  ipcMain.handle('doc:saveTo', async (_e, payload: { path: string; doc: unknown }) => {
    await writeLjam(payload.path, payload.doc)
    return payload.path
  })

  ipcMain.handle('doc:open', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const opts: Electron.OpenDialogOptions = {
      title: '開く',
      properties: ['openFile'],
      filters: [{ name: 'local-jam', extensions: ['ljam'] }]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (res.canceled || res.filePaths.length === 0) return null
    const buf = await readFile(res.filePaths[0])
    const zip = await JSZip.loadAsync(buf)
    const file = zip.file('document.json')
    if (!file) return null
    const json = await file.async('string')
    return { path: res.filePaths[0], doc: JSON.parse(json) }
  })

  // 軽量オートセーブ（userData にプレーンJSONで退避）
  const recoveryPath = (): string => join(app.getPath('userData'), 'recovery.json')
  ipcMain.handle('recovery:write', async (_e, payload: unknown) => {
    latestSnapshot = payload // MCP が参照する最新状態を更新
    await writeFile(recoveryPath(), JSON.stringify(payload))
  })
  ipcMain.handle('recovery:read', async () => {
    try {
      return JSON.parse(await readFile(recoveryPath(), 'utf-8'))
    } catch {
      return null
    }
  })
  ipcMain.handle('recovery:clear', async () => {
    try {
      await rm(recoveryPath())
    } catch {
      // ファイルが無ければ無視
    }
  })

  // マイテンプレート: userData/templates/<id>.ljat を 1テンプレ=1ファイル（ZIP+画像assets）で保持
  const templatesDir = (): string => join(app.getPath('userData'), 'templates')
  const tplPath = (id: string): string => join(templatesDir(), `${id}.ljat`)
  const genTplId = (): string => `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

  const listTemplateMeta = async (): Promise<{ id: string; name: string }[]> => {
    await mkdir(templatesDir(), { recursive: true })
    const files = (await readdir(templatesDir())).filter((f) => f.endsWith('.ljat'))
    const out: { id: string; name: string }[] = []
    for (const f of files) {
      try {
        out.push(await readMeta(await readFile(join(templatesDir(), f))))
      } catch {
        // 壊れたファイルは無視
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }

  // 旧 templates.json があれば一度だけ .ljat へ移行
  const migrateOldTemplates = async (): Promise<void> => {
    const oldPath = join(app.getPath('userData'), 'templates.json')
    let old: unknown
    try {
      old = JSON.parse(await readFile(oldPath, 'utf-8'))
    } catch {
      return
    }
    if (Array.isArray(old)) {
      for (const t of old as { name?: string; nodes?: unknown[]; edges?: unknown[] }[]) {
        const id = genTplId()
        await writeFile(tplPath(id), await packTemplate({ id, name: t.name ?? '(無題)', nodes: t.nodes ?? [], edges: t.edges }))
      }
    }
    try {
      await rename(oldPath, oldPath + '.bak')
    } catch {
      /* noop */
    }
  }

  ipcMain.handle('templates:list', async () => {
    await mkdir(templatesDir(), { recursive: true })
    const files = (await readdir(templatesDir())).filter((f) => f.endsWith('.ljat'))
    if (files.length === 0) await migrateOldTemplates()
    return listTemplateMeta()
  })
  ipcMain.handle('templates:get', async (_e, id: string) => {
    try {
      return await unpackTemplate(await readFile(tplPath(id)))
    } catch {
      return null
    }
  })
  ipcMain.handle('templates:save', async (_e, tpl: { name: string; nodes: unknown[]; edges?: unknown[] }) => {
    await mkdir(templatesDir(), { recursive: true })
    const id = genTplId()
    await writeFile(tplPath(id), await packTemplate({ id, name: tpl.name, nodes: tpl.nodes, edges: tpl.edges }))
    return listTemplateMeta()
  })
  ipcMain.handle('templates:remove', async (_e, id: string) => {
    try {
      await rm(tplPath(id))
    } catch {
      /* noop */
    }
    return listTemplateMeta()
  })
  ipcMain.handle('templates:export', async (_e, id: string) => {
    const win = BrowserWindow.getFocusedWindow()
    let name = id
    try {
      name = (await readMeta(await readFile(tplPath(id)))).name
    } catch {
      /* noop */
    }
    const opts: Electron.SaveDialogOptions = {
      title: 'テンプレートを書き出し',
      defaultPath: `${name}.ljat`,
      filters: [{ name: 'local-jam テンプレート', extensions: ['ljat'] }]
    }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return null
    await copyFile(tplPath(id), res.filePath)
    return res.filePath
  })
  ipcMain.handle('templates:import', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const opts: Electron.OpenDialogOptions = {
      title: 'テンプレートを取り込み',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'local-jam テンプレート', extensions: ['ljat'] }]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (res.canceled || res.filePaths.length === 0) return listTemplateMeta()
    await mkdir(templatesDir(), { recursive: true })
    for (const p of res.filePaths) {
      try {
        const tpl = await unpackTemplate(await readFile(p)) // assets を data URL へ復元
        const id = genTplId() // 衝突回避で新ID採番
        await writeFile(tplPath(id), await packTemplate({ id, name: tpl.name, nodes: tpl.nodes, edges: tpl.edges }))
      } catch {
        // 壊れた/非対応ファイルはスキップ
      }
    }
    return listTemplateMeta()
  })

  // 書き出し（PNG/PDF）: ダイアログで保存先を選びバイナリを書き込む
  ipcMain.handle(
    'export:save',
    async (
      _e,
      payload: { defaultPath: string; base64: string; filters: Electron.FileFilter[] }
    ) => {
      const win = BrowserWindow.getFocusedWindow()
      const opts: Electron.SaveDialogOptions = {
        title: '書き出し',
        defaultPath: payload.defaultPath,
        filters: payload.filters
      }
      const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
      if (res.canceled || !res.filePath) return null
      await writeFile(res.filePath, Buffer.from(payload.base64, 'base64'))
      return res.filePath
    }
  )

  // 画像ファイルを選んで data URL で返す
  ipcMain.handle('image:pick', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const opts: Electron.OpenDialogOptions = {
      title: '画像を選択',
      properties: ['openFile'],
      filters: [{ name: '画像', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (res.canceled || res.filePaths.length === 0) return null
    const buf = await readFile(res.filePaths[0])
    const ext = (res.filePaths[0].split('.').pop() ?? 'png').toLowerCase()
    const mime = ext === 'jpg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : `image/${ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  })
}

// 起動時: 退避済みドキュメントがあれば MCP 初期値として読み込む
async function loadInitialSnapshot(): Promise<void> {
  try {
    latestSnapshot = JSON.parse(await readFile(join(app.getPath('userData'), 'recovery.json'), 'utf-8'))
  } catch {
    // 無ければ null のまま
  }
}

app.whenReady().then(async () => {
  registerIpc()
  await loadInitialSnapshot()
  // 読み取り専用 MCP サーバ（localhostのみ）。Claude から http://localhost:4319/mcp で接続。
  // listen の EADDRINUSE は同期 throw ではなく 'error' イベントで飛ぶ。ハンドルしないと
  // 未捕捉例外ダイアログになるため、必ず 'error' を拾う（dev や別インスタンスが 4319 を
  // 使用中なら MCP だけスキップし、アプリ本体は通常起動させる）。
  try {
    const mcpServer = createMcpServer(() => latestSnapshot)
    mcpServer.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') {
        console.warn(
          `[local-jam] ポート ${MCP_PORT} が使用中のため MCP サーバは起動しません（dev や別インスタンスが起動中の可能性）。アプリは通常どおり使えます。`
        )
      } else {
        console.error('[local-jam] MCP server error:', e)
      }
    })
    mcpServer.listen(MCP_PORT, '127.0.0.1', () => {
      console.log(`[local-jam] MCP server: http://127.0.0.1:${MCP_PORT}/mcp`)
    })
  } catch (e) {
    console.error('[local-jam] MCP server failed to start:', e)
  }
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
