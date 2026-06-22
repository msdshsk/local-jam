export {}

interface RecoveryDoc {
  nodes?: unknown[]
  edges?: unknown[]
  viewport?: { x: number; y: number; zoom: number }
}

declare global {
  interface Window {
    jam: {
      saveDocumentAs: (doc: unknown) => Promise<string | null>
      saveDocumentTo: (path: string, doc: unknown) => Promise<string>
      openDocument: () => Promise<{ path: string; doc: unknown } | null>
      autosaveWrite: (payload: unknown) => Promise<void>
      autosaveRead: () => Promise<{ doc: RecoveryDoc; filePath: string | null } | null>
      autosaveClear: () => Promise<void>
      templatesList: () => Promise<{ id: string; name: string }[]>
      templatesGet: (id: string) => Promise<unknown>
      templatesSave: (tpl: unknown) => Promise<{ id: string; name: string }[]>
      templatesRemove: (id: string) => Promise<{ id: string; name: string }[]>
      templatesExport: (id: string) => Promise<string | null>
      templatesImport: () => Promise<{ id: string; name: string }[]>
      pickImage: () => Promise<string | null>
      exportSave: (payload: {
        defaultPath: string
        base64: string
        filters: { name: string; extensions: string[] }[]
      }) => Promise<string | null>
    }
  }
}
