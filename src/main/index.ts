import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile, rm } from 'node:fs/promises'
import JSZip from 'jszip'
import { createMcpServer } from './mcp'

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

  // マイテンプレート（userData/templates.json, アプリ横断）
  const templatesPath = (): string => join(app.getPath('userData'), 'templates.json')
  const readTemplates = async (): Promise<{ id: string }[]> => {
    try {
      return JSON.parse(await readFile(templatesPath(), 'utf-8'))
    } catch {
      return []
    }
  }
  ipcMain.handle('templates:list', async () => readTemplates())
  ipcMain.handle('templates:add', async (_e, tpl: { id: string }) => {
    const list = await readTemplates()
    list.push(tpl)
    await writeFile(templatesPath(), JSON.stringify(list))
    return list
  })
  ipcMain.handle('templates:remove', async (_e, id: string) => {
    const list = (await readTemplates()).filter((t) => t.id !== id)
    await writeFile(templatesPath(), JSON.stringify(list))
    return list
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
  try {
    createMcpServer(() => latestSnapshot).listen(MCP_PORT, '127.0.0.1', () => {
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
