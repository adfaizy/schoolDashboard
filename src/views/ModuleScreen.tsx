import { moduleById } from '../lib/modules'
import { AttendanceModuleView } from './AttendanceModuleView'
import { CrudModuleView } from './CrudModuleView'
import { ReportsView } from './ReportsView'
import type { ViewProps } from './shared'

export function ModuleScreen({ moduleId, shared, onBack }: {
  moduleId: string
  shared: ViewProps
  onBack: () => void
}) {
  if (moduleId === 'attendance') return <AttendanceModuleView {...shared} onBack={onBack} />
  if (moduleId === 'reports') return <ReportsView {...shared} onBack={onBack} />
  const module = moduleById(moduleId)
  if (!module) return null
  return <CrudModuleView module={module} {...shared} onBack={onBack} />
}
