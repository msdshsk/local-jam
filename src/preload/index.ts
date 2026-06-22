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
  templatesList: (): Promise<{ id: string; name: string }[]> => ipcRenderer.invoke('templates:list'),
  templatesGet: (id: string): Promise<unknown> => ipcRenderer.invoke('templates:get', id),
  templatesSave: (tpl: unknown): Promise<{ id: string; name: string }[]> =>
    ipcRenderer.invoke('templates:save', tpl),
  templatesRemove: (id: string): Promise<{ id: string; name: string }[]> =>
    ipcRenderer.invoke('templates:remove', id),
  templatesExport: (id: string): Promise<string | null> => ipcRenderer.invoke('templates:export', id),
  templatesImport: (): Promise<{ id: string; name: string }[]> => ipcRenderer.invoke('templates:import'),
  pickImage: (): Promise<string | null> => ipcRenderer.invoke('image:pick'),
  exportSave: (payload: {
    defaultPath: string
    base64: string
    filters: { name: string; extensions: string[] }[]
  }): Promise<string | null> => ipcRenderer.invoke('export:save', payload)
}

contextBridge.exposeInMainWorld('jam', api)
