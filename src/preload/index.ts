import { contextBridge, ipcRenderer } from 'electron'

// doc保存/開く・オートセーブ のIPC窓口（将来: テンプレCRUD等もここへ）
const api = {
  saveDocumentAs: (doc: unknown): Promise<string | null> => ipcRenderer.invoke('doc:saveAs', doc),
  saveDocumentTo: (path: string, doc: unknown): Promise<string> =>
    ipcRenderer.invoke('doc:saveTo', { path, doc }),
  openDocument: (): Promise<{ path: string; doc: unknown } | null> => ipcRenderer.invoke('doc:open'),
  autosaveWrite: (payload: unknown): Promise<void> => ipcRenderer.invoke('recovery:write', payload),
  autosaveRead: (): Promise<unknown> => ipcRenderer.invoke('recovery:read'),
  autosaveClear: (): Promise<void> => ipcRenderer.invoke('recovery:clear'),
  templatesList: (): Promise<unknown[]> => ipcRenderer.invoke('templates:list'),
  templatesAdd: (tpl: unknown): Promise<unknown[]> => ipcRenderer.invoke('templates:add', tpl),
  templatesRemove: (id: string): Promise<unknown[]> => ipcRenderer.invoke('templates:remove', id),
  pickImage: (): Promise<string | null> => ipcRenderer.invoke('image:pick'),
  exportSave: (payload: {
    defaultPath: string
    base64: string
    filters: { name: string; extensions: string[] }[]
  }): Promise<string | null> => ipcRenderer.invoke('export:save', payload)
}

contextBridge.exposeInMainWorld('jam', api)
