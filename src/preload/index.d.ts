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
      templatesList: () => Promise<unknown[]>
      templatesAdd: (tpl: unknown) => Promise<unknown[]>
      templatesRemove: (id: string) => Promise<unknown[]>
      pickImage: () => Promise<string | null>
      exportSave: (payload: {
        defaultPath: string
        base64: string
        filters: { name: string; extensions: string[] }[]
      }) => Promise<string | null>
    }
  }
}
