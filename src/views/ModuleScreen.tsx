import { moduleById } from '../lib/modules'
import { AttendanceModuleView } from './AttendanceModuleView'
import { ClassesView } from './ClassesView'
import { CrudModuleView } from './CrudModuleView'
import { ExamsView } from './ExamsView'
import { ReportsView } from './ReportsView'
import type { ViewProps } from './shared'

export function ModuleScreen({ moduleId, shared, onBack }: {
  moduleId: string
  shared: ViewProps
  onBack: () => void
}) {
  if (moduleId === 'attendance') return <AttendanceModuleView {...shared} onBack={onBack} />
  if (moduleId === 'reports') return <ReportsView {...shared} onBack={onBack} />
  if (moduleId === 'classes') return <ClassesView {...shared} onBack={onBack} />
  if (moduleId === 'exams') return <ExamsView {...shared} onBack={onBack} />
  const module = moduleById(moduleId)
  if (!module) return null
  return <CrudModuleView module={module} {...shared} onBack={onBack} />
}
