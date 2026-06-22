import { ReactFlowProvider } from '@xyflow/react'
import { useJamStore } from './store'
import Toolbar from './components/Toolbar'
import Palette from './components/Palette'
import Inspector from './components/Inspector'
import TableEditor from './components/TableEditor'
import TemplateNameModal from './components/TemplateNameModal'
import HelpModal from './components/HelpModal'
import Autosave from './components/Autosave'
import Canvas from './Canvas'

export default function App() {
  const inspectorOpen = useJamStore((s) => s.inspectorOpen)
  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full flex-col">
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <Palette />
          <div className="min-w-0 flex-1">
            <Canvas />
          </div>
          {inspectorOpen && <Inspector />}
        </div>
      </div>
      <TableEditor />
      <TemplateNameModal />
      <HelpModal />
      <Autosave />
    </ReactFlowProvider>
  )
}
