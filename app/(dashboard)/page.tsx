'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcularAntiguedad, calcularDiasVacacionPorAno } from '@/lib/vacation-calc'
import { getFechaIngreso, formatDate, formatNumber } from '@/lib/utils'
import type { Empleado, EmpleadoResumen } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Users, TrendingUp, AlertTriangle, CalendarCheck, ChevronRight, Loader2 } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend,
} from 'recharts'

export default function DashboardPage() {
  const [empleados, setEmpleados] = useState<EmpleadoResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptoFilter, setDeptoFilter] = useState('todos')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { fetchEmpleados() }, [])

  async function fetchEmpleados() {
    setLoading(true)
    const { data } = await supabase
      .from('empleados')
      .select(`*, periodos_vacacion(derecho_dias), vacaciones_tomadas(dias_habiles)`)
      .eq('activo', true)
      .order('departamento', { ascending: true })
      .order('numero', { ascending: true })

    if (data) {
      const resumen: EmpleadoResumen[] = data.map((emp: any) => {
        const fechaStr = getFechaIngreso(emp)
        const fecha = fechaStr ? new Date(fechaStr + 'T00:00:00') : null
        const antiguedad = fecha ? calcularAntiguedad(fecha) : { anos: 0, meses: 0 }
        const diasPorAno = calcularDiasVacacionPorAno(antiguedad.anos)
        const totalAcumulado = emp.periodos_vacacion?.reduce((s: number, p: any) => s + (p.derecho_dias || 0), 0) ?? 0
        const totalTomados = emp.vacaciones_tomadas?.reduce((s: number, v: any) => s + (Number(v.dias_habiles) || 0), 0) ?? 0
        return {
          ...emp,
          total_acumulado: totalAcumulado,
          total_tomados: totalTomados,
          saldo: totalAcumulado - totalTomados,
          antiguedad_anos: antiguedad.anos,
          antiguedad_meses: antiguedad.meses,
          dias_por_ano: diasPorAno,
        }
      })
      setEmpleados(resumen)
    }
    setLoading(false)
  }

  const filtered = empleados.filter(emp => {
    const matchSearch = emp.nombre_completo.toLowerCase().includes(search.toLowerCase())
    const matchDepto = deptoFilter === 'todos' || emp.departamento === deptoFilter
    return matchSearch && matchDepto
  })

  const totales = filtered.reduce(
    (acc, emp) => ({ acumulado: acc.acumulado + emp.total_acumulado, tomados: acc.tomados + emp.total_tomados, saldo: acc.saldo + emp.saldo }),
    { acumulado: 0, tomados: 0, saldo: 0 }
  )

  // KPI calculations
  const conSaldoNegativo = empleados.filter(e => e.saldo < 0).length
  const conSaldoPositivo = empleados.filter(e => e.saldo > 15).length // más de 15 días sin tomar = riesgo Art.36

  // Chart helpers & data
  function shortName(full: string) {
    const parts = full.trim().split(/\s+/)
    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0]
  }

  const chartStatus = [
    { name: 'Al dia', value: empleados.filter(e => e.saldo >= 0 && e.saldo <= 15).length, color: '#10b981' },
    { name: 'Saldo alto', value: empleados.filter(e => e.saldo > 15).length, color: '#f59e0b' },
    { name: 'Negativo', value: empleados.filter(e => e.saldo < 0).length, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const chartTopSaldo = [...empleados]
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 10)
    .map(e => ({ nombre: shortName(e.nombre_completo), saldo: Number(e.saldo.toFixed(1)) }))

  const chartDepto = [
    { depto: 'ADMIN', acumulado: 0, tomados: 0 },
    { depto: 'COMERCIAL', acumulado: 0, tomados: 0 },
    { depto: 'FABRICA', acumulado: 0, tomados: 0 },
  ]
  empleados.forEach(e => {
    const d = chartDepto.find(x => x.depto === e.departamento)
    if (d) { d.acumulado += e.total_acumulado; d.tomados += e.total_tomados }
  })

  function saldoBadge(saldo: number) {
    if (saldo > 0) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">{formatNumber(saldo)} días</Badge>
    if (saldo < 0) return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">{formatNumber(saldo)} días</Badge>
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">0 días</Badge>
  }

  function saldoColor(saldo: number) {
    if (saldo > 0) return 'text-emerald-600 font-bold'
    if (saldo < 0) return 'text-red-600 font-bold'
    return 'text-amber-600 font-bold'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-spartan-primary" />
        <p className="text-muted-foreground text-sm">Cargando información...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-spartan-primary">Panel de Control</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vacaciones &mdash; Ley General del Trabajo Arts. 33-36 &middot; Bolivia 2026
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-spartan-primary bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Empleados activos</p>
                <p className="text-3xl font-extrabold text-spartan-primary mt-1">{empleados.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-spartan-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-spartan-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Días acumulados</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">{formatNumber(empleados.reduce((s, e) => s + e.total_acumulado, 0))}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-400 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Saldo alto (+15 días)</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">{conSaldoPositivo}</p>
                <p className="text-xs text-amber-600 mt-0.5">Pendientes de tomar</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 bg-white ${conSaldoNegativo > 0 ? 'border-l-red-500' : 'border-l-slate-300'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Saldo negativo</p>
                <p className={`text-3xl font-extrabold mt-1 ${conSaldoNegativo > 0 ? 'text-red-600' : 'text-slate-400'}`}>{conSaldoNegativo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Días adelantados</p>
              </div>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${conSaldoNegativo > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                <AlertTriangle className={`h-5 w-5 ${conSaldoNegativo > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Donut — status distribution */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado de Saldos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {chartStatus.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={chartStatus} cx="50%" cy="45%" innerRadius={50} outerRadius={76} paddingAngle={3} dataKey="value">
                    {chartStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v: any, name: any) => [`${v} empleados`, name]} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar — dias acumulados vs tomados por departamento */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dias por Departamento</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartDepto} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="depto" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartsTooltip formatter={(v: any, name: any) => [`${v} dias`, name === 'acumulado' ? 'Acumulado' : 'Tomados']} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: '12px' }}
                  formatter={(val) => val === 'acumulado' ? 'Acumulado' : 'Tomados'} />
                <Bar dataKey="acumulado" fill="#1a365d" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tomados" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Horizontal bar — top 10 saldo */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Top 10 Saldo</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {chartTopSaldo.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartTopSaldo} layout="vertical" margin={{ top: 0, right: 20, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `${v}d`} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 9 }} width={72} />
                  <RechartsTooltip formatter={(v: any) => [`${v} dias`, 'Saldo']} />
                  <Bar dataKey="saldo" radius={[0, 4, 4, 0]}>
                    {chartTopSaldo.map((entry, i) => (
                      <Cell key={i} fill={entry.saldo >= 0 ? '#1a365d' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Art. 36 LGT notice when there are high balances */}
      {conSaldoPositivo > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
          <span>
            <strong>{conSaldoPositivo} empleado{conSaldoPositivo !== 1 ? 's tienen' : ' tiene'} más de 15 días de saldo acumulado.</strong>{' '}
            Según el Art. 36 de la LGT, las vacaciones deben tomarse en el año siguiente al período ganado.
            Se recomienda coordinar el goce de descanso pronto.
          </span>
        </div>
      )}

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar empleado por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={deptoFilter} onValueChange={setDeptoFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los departamentos</SelectItem>
                <SelectItem value="ADMIN">Administrativo</SelectItem>
                <SelectItem value="COMERCIAL">Comercial</SelectItem>
                <SelectItem value="FABRICA">Fábrica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No se encontraron empleados</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Intente con otro nombre o cambie el filtro de departamento</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-spartan-primary/8 hover:bg-spartan-primary/8">
                    <TableHead className="w-10 text-center font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Nombre</TableHead>
                    <TableHead className="font-semibold">Departamento</TableHead>
                    <TableHead className="font-semibold">Cargo</TableHead>
                    <TableHead className="font-semibold">F. Ingreso</TableHead>
                    <TableHead className="font-semibold">Antigüedad</TableHead>
                    <TableHead className="text-center font-semibold">Días/Año</TableHead>
                    <TableHead className="text-center font-semibold">Acumulado</TableHead>
                    <TableHead className="text-center font-semibold">Tomados</TableHead>
                    <TableHead className="text-center font-semibold">Saldo</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp, idx) => (
                    <TableRow
                      key={emp.id}
                      className={`cursor-pointer transition-colors hover:bg-spartan-primary/5 ${idx % 2 === 1 ? 'bg-slate-50/60' : ''}`}
                      onClick={() => router.push(`/empleados/${emp.id}`)}
                      title="Ver detalle del empleado"
                    >
                      <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-spartan-primary">{emp.nombre_completo}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{emp.departamento || '-'}</span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{emp.cargo || '-'}</TableCell>
                      <TableCell className="text-sm">{formatDate(getFechaIngreso(emp))}</TableCell>
                      <TableCell className="text-sm">{emp.antiguedad_anos}a {emp.antiguedad_meses}m</TableCell>
                      <TableCell className="text-center text-sm font-medium">{emp.dias_por_ano}</TableCell>
                      <TableCell className="text-center text-sm">{formatNumber(emp.total_acumulado)}</TableCell>
                      <TableCell className="text-center text-sm">{formatNumber(emp.total_tomados)}</TableCell>
                      <TableCell className="text-center">{saldoBadge(emp.saldo)}</TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground/40" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-spartan-primary/10 font-bold">
                    <TableCell colSpan={7} className="text-spartan-primary">TOTALES</TableCell>
                    <TableCell className="text-center">{formatNumber(totales.acumulado)}</TableCell>
                    <TableCell className="text-center">{formatNumber(totales.tomados)}</TableCell>
                    <TableCell className={`text-center ${saldoColor(totales.saldo)}`}>{formatNumber(totales.saldo)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

