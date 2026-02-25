'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcularAntiguedad, calcularDiasVacacionPorAno } from '@/lib/vacation-calc'
import { getFechaIngreso, formatDate } from '@/lib/utils'
import type { Empleado } from '@/types'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, UserPlus, Building2, Calendar, Briefcase, UserX, UserCheck, Eye, Loader2 } from 'lucide-react'

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptoFilter, setDeptoFilter] = useState('todos')
  const [activoFilter, setActivoFilter] = useState('activos')
  const [deleteTarget, setDeleteTarget] = useState<Empleado | null>(null)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [activateTarget, setActivateTarget] = useState<Empleado | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchEmpleados()
  }, [])

  async function fetchEmpleados() {
    setLoading(true)
    const { data } = await supabase
      .from('empleados')
      .select('*')
      .order('departamento', { ascending: true })
      .order('numero', { ascending: true })

    if (data) setEmpleados(data)
    setLoading(false)
  }

  function openDelete(e: React.MouseEvent, emp: Empleado) {
    e.stopPropagation()
    setDeleteTarget(emp)
    setDeleteStep(1)
  }

  function cancelDelete() { setDeleteTarget(null) }

  async function confirmActivate() {
    if (!activateTarget) return
    await supabase.from('empleados').update({ activo: true }).eq('id', activateTarget.id)
    setActivateTarget(null)
    fetchEmpleados()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('empleados').update({ activo: false }).eq('id', deleteTarget.id)
    setDeleteTarget(null)
    fetchEmpleados()
  }

  const filtered = empleados.filter(emp => {
    const matchSearch = emp.nombre_completo.toLowerCase().includes(search.toLowerCase())
    const matchDepto = deptoFilter === 'todos' || emp.departamento === deptoFilter
    const matchActivo = activoFilter === 'todos' || (activoFilter === 'activos' ? emp.activo : !emp.activo)
    return matchSearch && matchDepto && matchActivo
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-spartan-primary" />
        <p className="text-muted-foreground text-sm">Cargando empleados...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-spartan-primary">Empleados</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} empleado{filtered.length !== 1 ? 's' : ''}{activoFilter === 'activos' ? ' activos' : activoFilter === 'inactivos' ? ' inactivos' : ''}
          </p>
        </div>
        <Button onClick={() => router.push('/empleados/nuevo')} className="bg-spartan-primary hover:bg-spartan-primary/90 shadow-sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Empleado
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={activoFilter} onValueChange={setActivoFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activos">Solo activos</SelectItem>
            <SelectItem value="inactivos">Solo inactivos</SelectItem>
            <SelectItem value="todos">Activos e inactivos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptoFilter} onValueChange={setDeptoFilter}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="Filtrar por departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los departamentos</SelectItem>
                <SelectItem value="ADMIN">Administrativo</SelectItem>
            <SelectItem value="COMERCIAL">Comercial</SelectItem>
          <SelectItem value="FABRICA">Fábrica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center col-span-3">
          <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">No se encontraron empleados</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Intente con otro nombre o cambie los filtros</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((emp) => {
          const fechaStr = getFechaIngreso(emp)
          const fecha = fechaStr ? new Date(fechaStr + 'T00:00:00') : null
          const ant = fecha ? calcularAntiguedad(fecha) : { anos: 0, meses: 0 }
          const dias = calcularDiasVacacionPorAno(ant.anos)

          return (
            <Card key={emp.id} className={`hover:shadow-lg transition-shadow border-l-4 flex flex-col ${emp.activo ? 'border-l-spartan-primary' : 'border-l-gray-300 opacity-70'}`}>
              <CardContent className="pt-6 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg leading-tight">{emp.nombre_completo}</h3>
                  {!emp.activo && <Badge variant="outline" className="text-xs border-gray-400 text-gray-500">Inactivo</Badge>}
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>{emp.cargo || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{emp.departamento || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Ingreso: {formatDate(fechaStr)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline">{ant.anos}a {ant.meses}m</Badge>
                  <Badge className="bg-spartan-primary/10 text-spartan-primary hover:bg-spartan-primary/10">
                    {dias} días/año
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-6 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/empleados/${emp.id}`)}>
                  <Eye className="h-4 w-4 mr-2" /> Ver Detalle
                </Button>
                {emp.activo ? (
                  <Button variant="outline" size="sm" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={(e) => openDelete(e, emp)}>
                    <UserX className="h-4 w-4 mr-2" /> Desactivar
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="flex-1 border-green-400 text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); setActivateTarget(emp) }}>
                    <UserCheck className="h-4 w-4 mr-2" /> Activar
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Activate confirmation */}
      <Dialog open={!!activateTarget} onOpenChange={(o) => { if (!o) setActivateTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Activar empleado?</DialogTitle>
            <DialogDescription>
              ¿Confirma que desea reactivar a <strong>{activateTarget?.nombre_completo}</strong>?<br />
              Volverá a aparecer en los reportes activos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActivateTarget(null)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={confirmActivate}>
              <UserCheck className="h-4 w-4 mr-2" /> Sí, activar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 1 — First confirmation */}
      <Dialog open={!!deleteTarget && deleteStep === 1} onOpenChange={(o) => { if (!o) cancelDelete() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Desactivar empleado?</DialogTitle>
            <DialogDescription>
              Está a punto de desactivar a <strong>{deleteTarget?.nombre_completo}</strong>.
              El empleado dejará de aparecer en los reportes activos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelDelete}>Cancelar</Button>
            <Button variant="destructive" onClick={() => setDeleteStep(2)}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2 — Final confirmation */}
      <Dialog open={!!deleteTarget && deleteStep === 2} onOpenChange={(o) => { if (!o) cancelDelete() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmación final</DialogTitle>
            <DialogDescription>
              ¿Confirma definitivamente la desactivación de{' '}
              <strong>{deleteTarget?.nombre_completo}</strong>?<br />
              Esta acción puede revertirse desde la ficha del empleado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteStep(1)}>Volver</Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <UserX className="h-4 w-4 mr-2" /> Sí, desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
