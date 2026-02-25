'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  calcularAntiguedad, calcularDiasVacacionPorAno, calcularDiasHabiles,
  getEscalaTexto
} from '@/lib/vacation-calc'
import { getFechaIngreso, formatDate, formatNumber, cn } from '@/lib/utils'
import type { Empleado, PeriodoVacacion, VacacionTomada } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2, Pencil, CalendarIcon, Clock, Award, Loader2, CalendarDays, RefreshCw, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'

// ── Date helpers ─────────────────────────────────────────────────────────────
function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return ''
  const p = iso.split('-')
  if (p.length !== 3) return iso
  return `${p[2]}/${p[1]}/${p[0]}`
}

function parseDisplayDate(display: string): string {
  if (!display) return ''
  const parts = display.split('/')
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  return ''
}

function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export default function EmpleadoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const id = params.id as string

  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodoDialogOpen, setPeriodoDialogOpen] = useState(false)
  const [vacacionDialogOpen, setVacacionDialogOpen] = useState(false)
  const [editingPeriodo, setEditingPeriodo] = useState<PeriodoVacacion | null>(null)
  const [saving, setSaving] = useState(false)

  // Periodo form state
  const [pYearLabel, setPYearLabel] = useState('')
  const [pDesde, setPDesde] = useState('')
  const [pHasta, setPHasta] = useState('')
  const [pDiasTrab, setPDiasTrab] = useState('360')
  const [pDiasDerecho, setPDiasDerecho] = useState('15')

  // Vacacion form state
  const [vMode, setVMode] = useState<'single' | 'range'>('range')
  const [vSingleDate, setVSingleDate] = useState<Date | undefined>(undefined)
  const [vRange, setVRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [vDiasHabiles, setVDiasHabiles] = useState('')
  const [vMotivo, setVMotivo] = useState('')
  const [vAutorizado, setVAutorizado] = useState('')

  const fetchEmpleado = useCallback(async (forceRecalc = false) => {
    setLoading(true)

    // 1. Fetch current employee + existing periods
    const { data: snap } = await supabase
      .from('empleados')
      .select('*, periodos_vacacion(*)')
      .eq('id', id)
      .single()

    if (snap) {
      const fechaRef: string | null = snap.fecha_ingreso || snap.fecha_ingreso_cps
      const periodos: any[] = snap.periodos_vacacion || []

      // Detect stale: if Año 1 exists but its 'desde' does not match fecha_ingreso
      // this happens when the employee's start date was edited after periods were created.
      const anio1 = periodos.find((p: any) => p.anio_label === 'Año 1')
      const isStale = fechaRef && anio1 && anio1.desde !== fechaRef

      if (isStale || forceRecalc) {
        // Delete all auto-generated periods and regenerate from scratch
        await supabase.from('periodos_vacacion').delete().eq('empleado_id', id)
      }
    }

    // 2. Generate any missing periods up to today
    await supabase.rpc('calcular_siguiente_periodo', { p_emp_id: parseInt(id) })

    // 3. Re-fetch full data
    const { data } = await supabase
      .from('empleados')
      .select(`
        *,
        periodos_vacacion(*),
        vacaciones_tomadas(*)
      `)
      .eq('id', id)
      .single()

    if (data) {
      data.periodos_vacacion?.sort((a: any, b: any) => (a.desde || '').localeCompare(b.desde || ''))
      data.vacaciones_tomadas?.sort((a: any, b: any) => (a.fecha_desde || '').localeCompare(b.fecha_desde || ''))
      setEmpleado(data)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchEmpleado() }, [fetchEmpleado])

  // Auto-calculate dias habiles when vacation dates change
  useEffect(() => {
    if (vMode === 'single' && vSingleDate) {
      setVDiasHabiles(calcularDiasHabiles(vSingleDate, vSingleDate).toString())
    } else if (vMode === 'range' && vRange.from && vRange.to) {
      setVDiasHabiles(calcularDiasHabiles(vRange.from, vRange.to).toString())
    } else {
      setVDiasHabiles('')
    }
  }, [vMode, vSingleDate, vRange.from, vRange.to])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-spartan-primary" />
      <p className="text-muted-foreground text-sm">Cargando información del empleado...</p>
    </div>
  )
  if (!empleado) return <div className="flex items-center justify-center h-64"><p>Empleado no encontrado</p></div>

  const fechaStr = getFechaIngreso(empleado)
  const fecha = fechaStr ? new Date(fechaStr + 'T00:00:00') : null
  const antiguedad = fecha ? calcularAntiguedad(fecha) : { anos: 0, meses: 0 }
  const diasPorAno = calcularDiasVacacionPorAno(antiguedad.anos)
  const totalAcumulado = empleado.periodos_vacacion?.reduce((s, p) => s + (p.derecho_dias || 0), 0) ?? 0
  const totalTomados = empleado.vacaciones_tomadas?.reduce((s, v) => s + (Number(v.dias_habiles) || 0), 0) ?? 0
  const saldo = totalAcumulado - totalTomados

  // CRUD operations
  async function handleSavePeriodo() {
    setSaving(true)
    const payload = {
      anio_label: pYearLabel,
      desde: parseDisplayDate(pDesde) || null,
      hasta: parseDisplayDate(pHasta) || null,
      dias_trabajados: parseInt(pDiasTrab) || 360,
      derecho_dias: parseInt(pDiasDerecho) || 15,
    }
    if (editingPeriodo) {
      await supabase.from('periodos_vacacion').update(payload).eq('id', editingPeriodo.id)
    } else {
      await supabase.from('periodos_vacacion').insert({ empleado_id: id, ...payload })
    }
    setSaving(false)
    setPeriodoDialogOpen(false)
    setEditingPeriodo(null)
    resetPeriodoForm()
    fetchEmpleado()
  }

  async function handleAddVacacion() {
    let fechaDesde: string | null = null
    let fechaHasta: string | null = null

    if (vMode === 'single' && vSingleDate) {
      fechaDesde = vSingleDate.toISOString().split('T')[0]
      fechaHasta = fechaDesde
    } else if (vMode === 'range' && vRange.from) {
      fechaDesde = vRange.from.toISOString().split('T')[0]
      fechaHasta = vRange.to ? vRange.to.toISOString().split('T')[0] : fechaDesde
    }

    if (!fechaDesde) return

    setSaving(true)
    await supabase.from('vacaciones_tomadas').insert({
      empleado_id: id,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      dias_habiles: parseFloat(vDiasHabiles) || 0,
      motivo: vMotivo || null,
      autorizado_por: vAutorizado || null,
    })
    setSaving(false)
    setVacacionDialogOpen(false)
    resetVacacionForm()
    fetchEmpleado()
  }

  async function handleDeletePeriodo(periodoId: number) {
    await supabase.from('periodos_vacacion').delete().eq('id', periodoId)
    fetchEmpleado()
  }

  async function handleDeleteVacacion(vacacionId: number) {
    await supabase.from('vacaciones_tomadas').delete().eq('id', vacacionId)
    fetchEmpleado()
  }

  async function handleRecalcularPeriodos() {
    setSaving(true)
    await fetchEmpleado(true)
    setSaving(false)
  }

  async function handleDeleteEmpleado() {
    await supabase.from('empleados').update({ activo: false }).eq('id', id)
    router.push('/empleados')
  }

  function resetPeriodoForm() {
    const nextNum = (empleado?.periodos_vacacion?.length || 0) + 1
    setPYearLabel(`Año ${nextNum}`)
    setPDesde('')
    setPHasta('')
    setPDiasTrab('360')
    setPDiasDerecho(diasPorAno.toString())
    setEditingPeriodo(null)
  }

  function openEditPeriodoDialog(p: PeriodoVacacion) {
    setPYearLabel(p.anio_label || '')
    setPDesde(isoToDisplay(p.desde))
    setPHasta(isoToDisplay(p.hasta))
    setPDiasTrab((p.dias_trabajados ?? 360).toString())
    setPDiasDerecho((p.derecho_dias ?? 15).toString())
    setEditingPeriodo(p)
    setPeriodoDialogOpen(true)
  }

  function resetVacacionForm() {
    setVMode('range')
    setVSingleDate(undefined)
    setVRange({ from: undefined, to: undefined })
    setVDiasHabiles('')
    setVMotivo('')
    setVAutorizado('')
  }

  function openPeriodoDialog() {
    resetPeriodoForm()
    setPeriodoDialogOpen(true)
  }

  function openVacacionDialog() {
    resetVacacionForm()
    setVacacionDialogOpen(true)
  }

  const saldoPreview = vDiasHabiles ? saldo - parseFloat(vDiasHabiles) : saldo

  // helpers to check if any date is selected in vacation form
  const vacHasDate = vMode === 'single' ? !!vSingleDate : !!vRange.from

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/empleados')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-spartan-primary">{empleado.nombre_completo}</h1>
            <p className="text-muted-foreground">{empleado.cargo} - {empleado.departamento}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">Desactivar Empleado</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desactivar empleado?</AlertDialogTitle>
              <AlertDialogDescription>
                El empleado sera marcado como inactivo. Esta accion se puede revertir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEmpleado}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CalendarIcon className="h-4 w-4" /> Fecha Ingreso
            </div>
            <p className="text-lg font-semibold">{formatDate(fechaStr)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" /> Antigüedad
            </div>
            <p className="text-lg font-semibold">{antiguedad.anos} años, {antiguedad.meses} meses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Award className="h-4 w-4" /> Escala Actual
            </div>
            <p className="text-lg font-semibold">{diasPorAno} días/año</p>
            <p className="text-xs text-muted-foreground">{getEscalaTexto(antiguedad.anos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Nro. Cuenta</div>
            <p className="text-lg font-semibold">{empleado.nro_cuenta || '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="periodos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="periodos">Periodos Acumulados</TabsTrigger>
          <TabsTrigger value="vacaciones">Vacaciones Tomadas</TabsTrigger>
        </TabsList>

        {/* Tab: Periodos */}
        <TabsContent value="periodos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Periodos Acumulados</CardTitle>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" disabled={saving}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', saving && 'animate-spin')} />
                        Recalcular
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Recalcular todos los períodos?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminarán todos los períodos actuales y se regenerarán automáticamente
                          desde el Año 1 según la fecha de ingreso actual ({formatDate(fechaStr)}).
                          Los períodos editados manualmente se perderán.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRecalcularPeriodos}>Recalcular</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button size="sm" onClick={openPeriodoDialog} className="bg-spartan-primary hover:bg-spartan-primary/90">
                    <Plus className="h-4 w-4 mr-2" /> Agregar Periodo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">N</TableHead>
                      <TableHead>Año</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hasta</TableHead>
                      <TableHead className="text-center">Días Trabajados</TableHead>
                      <TableHead className="text-center">Días Derecho</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empleado.periodos_vacacion?.map((p, idx) => (
                      <TableRow key={p.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{p.anio_label}</TableCell>
                        <TableCell>{formatDate(p.desde)}</TableCell>
                        <TableCell>{formatDate(p.hasta)}</TableCell>
                        <TableCell className="text-center">{p.dias_trabajados ?? '-'}</TableCell>
                        <TableCell className="text-center font-semibold">{p.derecho_dias ?? '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditPeriodoDialog(p)}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminar periodo?</AlertDialogTitle>
                                  <AlertDialogDescription>Se eliminará el periodo {p.anio_label}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeletePeriodo(p.id)}>Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!empleado.periodos_vacacion || empleado.periodos_vacacion.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Los períodos se generan automáticamente al cargar la página.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={5}>Total Dias Acumulados</TableCell>
                      <TableCell className="text-center">{formatNumber(totalAcumulado)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Vacaciones */}
        <TabsContent value="vacaciones">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vacaciones Tomadas</CardTitle>
                <Button size="sm" onClick={openVacacionDialog} className="bg-spartan-primary hover:bg-spartan-primary/90">
                  <Plus className="h-4 w-4 mr-2" /> Registrar Vacación
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">N</TableHead>
                      <TableHead>Fecha Desde</TableHead>
                      <TableHead>Fecha Hasta</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-center">Días Hábiles</TableHead>
                      <TableHead>Autorizado Por</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empleado.vacaciones_tomadas?.map((v, idx) => (
                      <TableRow key={v.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{formatDate(v.fecha_desde)}</TableCell>
                        <TableCell>{formatDate(v.fecha_hasta)}</TableCell>
                        <TableCell className="text-sm">{v.motivo || '-'}</TableCell>
                        <TableCell className="text-center font-semibold">{formatNumber(Number(v.dias_habiles))}</TableCell>
                        <TableCell className="text-sm">{v.autorizado_por || '-'}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar vacación?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará la vacación del {formatDate(v.fecha_desde)} ({formatNumber(Number(v.dias_habiles))} días).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteVacacion(v.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!empleado.vacaciones_tomadas || empleado.vacaciones_tomadas.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Sin vacaciones registradas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={4}>Total Días Tomados</TableCell>
                      <TableCell className="text-center">{formatNumber(totalTomados)}</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Cards */}
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Acumulado</p>
            <p className="text-3xl font-bold text-blue-600">{formatNumber(totalAcumulado)}</p>
            <p className="text-xs text-muted-foreground">días de derecho</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Tomados</p>
            <p className="text-3xl font-bold text-orange-600">{formatNumber(totalTomados)}</p>
            <p className="text-xs text-muted-foreground">días utilizados</p>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4", saldo > 0 ? "border-l-green-500" : saldo < 0 ? "border-l-red-500" : "border-l-yellow-500")}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Saldo</p>
            <p className={cn("text-3xl font-bold", saldo > 0 ? "text-green-600" : saldo < 0 ? "text-red-600" : "text-yellow-600")}>
              {formatNumber(saldo)}
            </p>
            <Badge className={cn("mt-1", saldo > 0 ? "bg-green-100 text-green-700" : saldo < 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700")}>
              {saldo > 0 ? 'Saldo positivo' : saldo < 0 ? 'Excedido' : 'Al día'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Agregar Periodo */}
      <Dialog open={periodoDialogOpen} onOpenChange={(open) => { if (!open) { setPeriodoDialogOpen(false); setEditingPeriodo(null) } else setPeriodoDialogOpen(true) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPeriodo ? 'Editar Período' : 'Agregar Período Acumulado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Etiqueta del Año</Label>
              <Input value={pYearLabel} onChange={(e) => setPYearLabel(e.target.value)} placeholder="Ej: Año 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Período Desde</Label>
                <Input type="text" placeholder="DD/MM/AAAA" maxLength={10} value={pDesde} onChange={(e) => setPDesde(e.target.value)} />
              </div>
              <div>
                <Label>Período Hasta</Label>
                <Input type="text" placeholder="DD/MM/AAAA" maxLength={10} value={pHasta} onChange={(e) => setPHasta(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Días Trabajados</Label>
                <Input type="number" value={pDiasTrab} onChange={(e) => setPDiasTrab(e.target.value)} />
              </div>
              <div>
                <Label>Días de Derecho</Label>
                <Select value={pDiasDerecho} onValueChange={setPDiasDerecho}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 días (1-4 años)</SelectItem>
                    <SelectItem value="20">20 días (5-9 años)</SelectItem>
                    <SelectItem value="30">30 días (10+ años)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPeriodoDialogOpen(false); setEditingPeriodo(null) }}>Cancelar</Button>
            <Button onClick={handleSavePeriodo} disabled={saving} className="bg-spartan-primary hover:bg-spartan-primary/90">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar Vacacion */}
      <Dialog open={vacacionDialogOpen} onOpenChange={setVacacionDialogOpen}>
        <DialogContent hideCloseButton className="max-w-sm sm:max-w-md p-0 overflow-hidden">

          {/* Header fijo — sin colisión con nav del calendario */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-spartan-primary" />
              <span className="text-base font-semibold">Registrar Vacación</span>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>

          {/* Cuerpo con scroll propio */}
          <div className="overflow-y-auto max-h-[calc(90vh-130px)] px-5 py-4 space-y-4">

            {/* Mode toggle */}
            <div className="flex rounded-lg border bg-muted/30 p-1 gap-1">
              <button
                type="button"
                onClick={() => { setVMode('single'); setVRange({ from: undefined, to: undefined }) }}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  vMode === 'single'
                    ? 'bg-spartan-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background',
                )}
              >
                Un día
              </button>
              <button
                type="button"
                onClick={() => { setVMode('range'); setVSingleDate(undefined) }}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  vMode === 'range'
                    ? 'bg-spartan-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background',
                )}
              >
                Rango de fechas
              </button>
            </div>

            {/* Calendario — sin bordes extra, el componente ya tiene estilo */}
            <div className="flex justify-center rounded-xl border bg-card shadow-sm">
              {vMode === 'single' ? (
                <Calendar
                  mode="single"
                  selected={vSingleDate}
                  onSelect={setVSingleDate}
                />
              ) : (
                <Calendar
                  mode="range"
                  selected={vRange}
                  onSelect={(r) => setVRange(r ?? { from: undefined, to: undefined })}
                />
              )}
            </div>

            {/* Resumen de fechas seleccionadas */}
            {vacHasDate && (
              <div className={cn(
                'flex items-start gap-2 px-3 py-2.5 rounded-lg border text-sm',
                vDiasHabiles
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700',
              )}>
                <CalendarDays className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {vDiasHabiles ? (
                    <>
                      <strong>{vDiasHabiles} días hábiles</strong>
                      {vMode === 'single' && vSingleDate && (
                        <> — {format(vSingleDate, "EEEE dd 'de' MMMM yyyy", { locale: es })}</>
                      )}
                      {vMode === 'range' && vRange.from && vRange.to && (
                        <> — del {format(vRange.from, "dd 'de' MMM", { locale: es })} al {format(vRange.to, "dd 'de' MMM yyyy", { locale: es })}</>
                      )}
                    </>
                  ) : (
                    vMode === 'range' && vRange.from && !vRange.to
                      ? <>Inicio: <strong>{format(vRange.from, "dd 'de' MMMM", { locale: es })}</strong> — selecciona la fecha de fin</>
                      : 'Calculando días hábiles...'
                  )}
                </span>
              </div>
            )}

            {/* Motivo */}
            <div>
              <Label className="text-sm font-medium">Motivo / Observaciones</Label>
              <Textarea
                value={vMotivo}
                onChange={(e) => setVMotivo(e.target.value)}
                placeholder="Opcional — ej: Vacación anual, descanso médico..."
                className="resize-none mt-1.5"
                rows={2}
              />
            </div>

            {/* Autorizado por */}
            <div>
              <Label className="text-sm font-medium">Autorizado Por</Label>
              <Input
                value={vAutorizado}
                onChange={(e) => setVAutorizado(e.target.value)}
                placeholder="Nombre del responsable (opcional)"
                className="mt-1.5"
              />
            </div>

            {/* Saldo preview */}
            {vDiasHabiles && (
              <div className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium',
                saldoPreview >= 0
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700',
              )}>
                <span className="flex-1">
                  Saldo resultante:{' '}
                  <strong className="text-base">{formatNumber(saldoPreview)} días</strong>
                </span>
                {saldoPreview < 0 && (
                  <span className="text-xs bg-red-100 px-2 py-0.5 rounded-full">Excedido</span>
                )}
              </div>
            )}
          </div>

          {/* Footer fijo */}
          <div className="flex justify-end gap-2 px-5 py-3 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setVacacionDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAddVacacion}
              disabled={saving || !vacHasDate || !vDiasHabiles}
              className="bg-spartan-primary hover:bg-spartan-primary/90"
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar'}
            </Button>
          </div>

        </DialogContent>
      </Dialog>
    </div>
  )
}
