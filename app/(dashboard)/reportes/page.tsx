'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularAntiguedad, calcularDiasVacacionPorAno } from '@/lib/vacation-calc'
import { getFechaIngreso, formatDate, formatNumber } from '@/lib/utils'
import type { EmpleadoResumen, PeriodoVacacion, VacacionTomada } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileDown, FileSpreadsheet, Eye, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const DEPTO_LABEL: Record<string, string> = {
  ADMIN: 'Administrativo',
  COMERCIAL: 'Comercial',
  FABRICA: 'Fábrica',
}

interface EmpDetail {
  periodos: PeriodoVacacion[]
  vacaciones: VacacionTomada[]
}

export default function ReportesPage() {
  const [empleados, setEmpleados] = useState<EmpleadoResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [deptoFilter, setDeptoFilter] = useState('todos')
  const [saldoFilter, setSaldoFilter] = useState('todos')
  const [activoFilter, setActivoFilter] = useState('activos')

  // Detail modal state
  const [selectedEmp, setSelectedEmp] = useState<EmpleadoResumen | null>(null)
  const [empDetail, setEmpDetail] = useState<EmpDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('empleados')
      .select(`*, periodos_vacacion(derecho_dias), vacaciones_tomadas(dias_habiles)`)
      .order('departamento', { ascending: true })
      .order('numero', { ascending: true })

    if (data) {
      const resumen: EmpleadoResumen[] = data.map((emp: any) => {
        const fechaStr = getFechaIngreso(emp)
        const fecha = fechaStr ? new Date(fechaStr + 'T00:00:00') : null
        const ant = fecha ? calcularAntiguedad(fecha) : { anos: 0, meses: 0 }
        const diasPorAno = calcularDiasVacacionPorAno(ant.anos)
        const totalAcumulado = emp.periodos_vacacion?.reduce((s: number, p: any) => s + (p.derecho_dias || 0), 0) ?? 0
        const totalTomados = emp.vacaciones_tomadas?.reduce((s: number, v: any) => s + (Number(v.dias_habiles) || 0), 0) ?? 0
        return {
          ...emp,
          total_acumulado: totalAcumulado,
          total_tomados: totalTomados,
          saldo: totalAcumulado - totalTomados,
          antiguedad_anos: ant.anos,
          antiguedad_meses: ant.meses,
          dias_por_ano: diasPorAno,
        }
      })
      setEmpleados(resumen)
    }
    setLoading(false)
  }

  async function openDetail(emp: EmpleadoResumen) {
    setSelectedEmp(emp)
    setEmpDetail(null)
    setDetailLoading(true)
    const [{ data: periodos }, { data: vacaciones }] = await Promise.all([
      supabase
        .from('periodos_vacacion')
        .select('*')
        .eq('empleado_id', emp.id)
        .order('desde', { ascending: true }),
      supabase
        .from('vacaciones_tomadas')
        .select('*')
        .eq('empleado_id', emp.id)
        .order('fecha_desde', { ascending: false }),
    ])
    setEmpDetail({
      periodos: (periodos as PeriodoVacacion[]) ?? [],
      vacaciones: (vacaciones as VacacionTomada[]) ?? [],
    })
    setDetailLoading(false)
  }

  async function exportDetailPDF() {
    if (!selectedEmp || !empDetail) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const today = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })
    const todayFile = new Date().toISOString().slice(0, 10)

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
    const pw = doc.internal.pageSize.getWidth()

    // Header empresa
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('SPARTAN DE BOLIVIA S.R.L.', pw / 2, 16, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Reporte Individual de Vacaciones', pw / 2, 22, { align: 'center' })
    doc.setFontSize(8)
    doc.text('Ley General del Trabajo Arts. 33-36  |  Bolivia', pw / 2, 27, { align: 'center' })

    // Ficha empleado
    doc.setDrawColor(26, 54, 93)
    doc.setFillColor(240, 245, 255)
    doc.roundedRect(14, 32, pw - 28, 32, 2, 2, 'FD')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 54, 93)
    doc.text(selectedEmp.nombre_completo, 18, 40)

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const depto = DEPTO_LABEL[selectedEmp.departamento ?? ''] ?? selectedEmp.departamento ?? '-'
    doc.text('Departamento: ' + depto, 18, 47)
    doc.text('Cargo: ' + (selectedEmp.cargo ?? '-'), 18, 53)
    doc.text('F. Ingreso: ' + formatDate(getFechaIngreso(selectedEmp)), 18, 59)
    doc.text('Antiguedad: ' + selectedEmp.antiguedad_anos + 'a ' + selectedEmp.antiguedad_meses + 'm', 100, 47)
    doc.text('Días/Año: ' + selectedEmp.dias_por_ano, 100, 53)
    doc.text('Fecha emisión: ' + today, 100, 59)

    // KPIs
    const kpis = [
      { label: 'Acumulado', value: formatNumber(selectedEmp.total_acumulado) + ' dias', color: [22, 101, 52] as [number,number,number] },
      { label: 'Tomados', value: formatNumber(selectedEmp.total_tomados) + ' dias', color: [30, 64, 175] as [number,number,number] },
      { label: 'Saldo', value: formatNumber(selectedEmp.saldo) + ' dias',
        color: (selectedEmp.saldo > 0 ? [22,101,52] : selectedEmp.saldo < 0 ? [153,27,27] : [133,100,4]) as [number,number,number] },
    ]
    const kpiW = (pw - 28) / 3
    kpis.forEach((k, i) => {
      const x = 14 + i * kpiW
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(220, 228, 240)
      doc.roundedRect(x, 68, kpiW - 2, 16, 1, 1, 'FD')
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.text(k.label, x + kpiW / 2 - 1, 74, { align: 'center' })
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...k.color)
      doc.text(k.value, x + kpiW / 2 - 1, 80, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0)
    })

    let curY = 90

    // Tabla periodos
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 54, 93)
    doc.text('PERIODOS ACUMULADOS', 14, curY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0)

    autoTable(doc, {
      startY: curY + 3,
      head: [['Periodo', 'Desde', 'Hasta', 'Dias Trabajados', 'Derecho (dias)']],
      body: empDetail.periodos.length > 0
        ? empDetail.periodos.map(p => [
            p.anio_label ?? '-',
            formatDate(p.desde),
            formatDate(p.hasta),
            p.dias_trabajados ?? '-',
            formatNumber(p.derecho_dias ?? 0),
          ])
        : [['Sin periodos registrados', '', '', '', '']],
      styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
      headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 }, 3: { cellWidth: 34 }, 4: { cellWidth: 34 } },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      didDrawPage: () => {},
    })

    curY = (doc as any).lastAutoTable.finalY + 10

    // Tabla vacaciones tomadas
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 54, 93)
    doc.text('VACACIONES TOMADAS', 14, curY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0)

    autoTable(doc, {
      startY: curY + 3,
      head: [['Desde', 'Hasta', 'Dias Habiles', 'Motivo', 'Autorizado por']],
      body: empDetail.vacaciones.length > 0
        ? empDetail.vacaciones.map(v => [
            formatDate(v.fecha_desde),
            formatDate(v.fecha_hasta),
            formatNumber(v.dias_habiles),
            v.motivo ?? '-',
            v.autorizado_por ?? '-',
          ])
        : [['Sin vacaciones registradas', '', '', '', '']],
      styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
      headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 26 }, 2: { cellWidth: 26 }, 3: { halign: 'left', cellWidth: 50 }, 4: { halign: 'left', cellWidth: 40 } },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      didDrawPage: () => {},
    })

    // Page numbers
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text('Página ' + i + ' de ' + pageCount, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
    }

    const safeName = selectedEmp.nombre_completo.replace(/[^a-zA-Z0-9]/g, '_')
    doc.save('Detalle_' + safeName + '_' + todayFile + '.pdf')
  }

  const filtered = empleados.filter(emp => {
    const matchDepto = deptoFilter === 'todos' || emp.departamento === deptoFilter
    const matchActivo = activoFilter === 'todos' || (activoFilter === 'activos' ? emp.activo : !emp.activo)
    let matchSaldo = true
    if (saldoFilter === 'positivo') matchSaldo = emp.saldo > 0
    if (saldoFilter === 'negativo') matchSaldo = emp.saldo < 0
    if (saldoFilter === 'cero') matchSaldo = emp.saldo === 0
    return matchDepto && matchActivo && matchSaldo
  })

  const totales = filtered.reduce(
    (acc, emp) => ({
      acumulado: acc.acumulado + emp.total_acumulado,
      tomados: acc.tomados + emp.total_tomados,
      saldo: acc.saldo + emp.saldo,
    }),
    { acumulado: 0, tomados: 0, saldo: 0 }
  )

  const today = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })
  const todayFile = new Date().toISOString().slice(0, 10)

  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('SPARTAN DE BOLIVIA S.R.L.', doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Control de Vacaciones - Ley General del Trabajo Arts. 33-36', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' })
    doc.setFontSize(9)
    doc.text('Fecha de emision: ' + today, doc.internal.pageSize.getWidth() / 2, 31, { align: 'center' })

    const head = [['N°', 'Nombre Completo', 'Departamento', 'Cargo', 'Fecha Ingreso', 'Antigüedad', 'Días/Año', 'Acumulado', 'Tomados', 'Saldo']]

    const body = filtered.map((emp, idx) => [
      idx + 1,
      emp.nombre_completo,
      DEPTO_LABEL[emp.departamento ?? ''] ?? emp.departamento ?? '-',
      emp.cargo ?? '-',
      formatDate(getFechaIngreso(emp)),
      emp.antiguedad_anos + 'a ' + emp.antiguedad_meses + 'm',
      emp.dias_por_ano,
      formatNumber(emp.total_acumulado),
      formatNumber(emp.total_tomados),
      formatNumber(emp.saldo),
    ])

    body.push(['', 'TOTALES', '', '', '', '', '', formatNumber(totales.acumulado), formatNumber(totales.tomados), formatNumber(totales.saldo)] as any)

    autoTable(doc, {
      head,
      body,
      startY: 36,
      styles: { fontSize: 8, cellPadding: 2.5, halign: 'center' },
      headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { halign: 'left', cellWidth: 52 },
        2: { cellWidth: 26 },
        3: { halign: 'left', cellWidth: 38 },
        4: { cellWidth: 24 },
        5: { cellWidth: 20 },
        6: { cellWidth: 18 },
        7: { cellWidth: 22 },
        8: { cellWidth: 18 },
        9: { cellWidth: 18 },
      },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      didParseCell(data) {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [220, 230, 242]
        }
        if (data.column.index === 9 && data.row.index < body.length - 1) {
          const rawSaldo = filtered[data.row.index]?.saldo ?? 0
          if (rawSaldo > 0) data.cell.styles.textColor = [22, 101, 52]
          else if (rawSaldo < 0) data.cell.styles.textColor = [153, 27, 27]
          else data.cell.styles.textColor = [133, 100, 4]
        }
      },
      didDrawPage(data) {
        const pageCount = (doc as any).internal.getNumberOfPages()
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text('Página ' + data.pageNumber + ' de ' + pageCount, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
        doc.setTextColor(0)
      },
    })

    doc.save('Reporte_Vacaciones_Spartan_' + todayFile + '.pdf')
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')

    const header = ['N°', 'Nombre Completo', 'Departamento', 'Cargo', 'Fecha Ingreso', 'Antigüedad (años)', 'Antigüedad (meses)', 'Días/Año', 'Acumulado', 'Tomados', 'Saldo']

    const rows = filtered.map((emp, idx) => [
      idx + 1,
      emp.nombre_completo,
      DEPTO_LABEL[emp.departamento ?? ''] ?? emp.departamento ?? '-',
      emp.cargo ?? '-',
      formatDate(getFechaIngreso(emp)),
      emp.antiguedad_anos,
      emp.antiguedad_meses,
      emp.dias_por_ano,
      emp.total_acumulado,
      emp.total_tomados,
      emp.saldo,
    ])

    const totalsRow = ['', 'TOTALES', '', '', '', '', '', '', totales.acumulado, totales.tomados, totales.saldo]

    const wsData = [
      ['SPARTAN DE BOLIVIA S.R.L.'],
      ['Control de Vacaciones - Ley General del Trabajo Arts. 33-36'],
      ['Fecha de emision: ' + today],
      [],
      header,
      ...rows,
      totalsRow,
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [
      { wch: 5 }, { wch: 38 }, { wch: 18 }, { wch: 28 },
      { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
      { wch: 13 }, { wch: 12 }, { wch: 12 },
    ]
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vacaciones')
    XLSX.writeFile(wb, 'Reporte_Vacaciones_Spartan_' + todayFile + '.xlsx')
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-spartan-primary" />
      <p className="text-muted-foreground text-sm">Cargando reportes...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-spartan-primary">Reportes de Vacaciones</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} empleados &mdash; Haz clic en <Eye className="inline h-3.5 w-3.5" /> para ver el detalle individual</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={exportExcel} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
          <Button onClick={exportPDF} className="bg-spartan-primary hover:bg-spartan-primary/90">
            <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={activoFilter} onValueChange={setActivoFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activos">Solo activos</SelectItem>
            <SelectItem value="inactivos">Solo inactivos</SelectItem>
            <SelectItem value="todos">Activos e inactivos</SelectItem>
          </SelectContent>
        </Select>

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

        <Select value={saldoFilter} onValueChange={setSaldoFilter}>
          <SelectTrigger className="w-full sm:w-[185px]">
            <SelectValue placeholder="Filtrar saldo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los saldos</SelectItem>
            <SelectItem value="positivo">Saldo Positivo</SelectItem>
            <SelectItem value="negativo">Saldo Negativo</SelectItem>
            <SelectItem value="cero">Saldo Cero</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-spartan-primary/5">
                  <TableHead className="w-10">N°</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Depto.</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Antigüedad</TableHead>
                  <TableHead className="text-center">Días/Año</TableHead>
                  <TableHead className="text-center">Acumulado</TableHead>
                  <TableHead className="text-center">Tomados</TableHead>
                  <TableHead className="text-center">Saldo</TableHead>
                  <TableHead className="text-center w-20">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp, idx) => (
                  <TableRow key={emp.id} className={"text-sm " + (!emp.activo ? 'opacity-60 bg-gray-50' : '')}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {emp.nombre_completo}
                        {!emp.activo && <Badge variant="outline" className="text-xs border-gray-400 text-gray-500">Inactivo</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{DEPTO_LABEL[emp.departamento ?? ''] ?? emp.departamento ?? '-'}</TableCell>
                    <TableCell className="text-xs">{emp.cargo ?? '-'}</TableCell>
                    <TableCell>{formatDate(getFechaIngreso(emp))}</TableCell>
                    <TableCell>{emp.antiguedad_anos}a {emp.antiguedad_meses}m</TableCell>
                    <TableCell className="text-center">{emp.dias_por_ano}</TableCell>
                    <TableCell className="text-center">{formatNumber(emp.total_acumulado)}</TableCell>
                    <TableCell className="text-center">{formatNumber(emp.total_tomados)}</TableCell>
                    <TableCell className={"text-center font-semibold " + (emp.saldo > 0 ? 'text-green-600' : emp.saldo < 0 ? 'text-red-600' : 'text-yellow-600')}>
                      {formatNumber(emp.saldo)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetail(emp)}
                        className="h-8 w-8 p-0 text-spartan-primary hover:bg-spartan-primary/10"
                        title="Ver reporte detallado"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold bg-spartan-primary/10">
                  <TableCell colSpan={7}>TOTALES</TableCell>
                  <TableCell className="text-center">{formatNumber(totales.acumulado)}</TableCell>
                  <TableCell className="text-center">{formatNumber(totales.tomados)}</TableCell>
                  <TableCell className={"text-center " + (totales.saldo >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {formatNumber(totales.saldo)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEmp} onOpenChange={(open) => { if (!open) { setSelectedEmp(null); setEmpDetail(null) } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-spartan-primary text-lg">
              Reporte Detallado &mdash; {selectedEmp?.nombre_completo}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-spartan-primary" />
              <span className="text-muted-foreground text-sm">Cargando detalle...</span>
            </div>
          ) : selectedEmp && empDetail ? (
            <div className="space-y-5 pt-1">

              {/* Ficha empleado */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Departamento</p>
                  <p className="font-semibold text-sm mt-0.5">{DEPTO_LABEL[selectedEmp.departamento ?? ''] ?? selectedEmp.departamento ?? '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Cargo</p>
                  <p className="font-semibold text-sm mt-0.5">{selectedEmp.cargo ?? '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha Ingreso</p>
                  <p className="font-semibold text-sm mt-0.5">{formatDate(getFechaIngreso(selectedEmp))}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Antigüedad</p>
                  <p className="font-semibold text-sm mt-0.5">{selectedEmp.antiguedad_anos}a {selectedEmp.antiguedad_meses}m</p>
                </div>
              </div>

              {/* KPI saldo cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-l-4 border-l-spartan-primary">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Acumulado</p>
                    <p className="text-2xl font-extrabold text-spartan-primary">{formatNumber(selectedEmp.total_acumulado)} <span className="text-sm font-normal">días</span></p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-400">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Tomados</p>
                    <p className="text-2xl font-extrabold text-blue-600">{formatNumber(selectedEmp.total_tomados)} <span className="text-sm font-normal">días</span></p>
                  </CardContent>
                </Card>
                <Card className={"border-l-4 " + (selectedEmp.saldo > 0 ? 'border-l-emerald-500' : selectedEmp.saldo < 0 ? 'border-l-red-500' : 'border-l-amber-400')}>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo</p>
                    <p className={"text-2xl font-extrabold " + (selectedEmp.saldo > 0 ? 'text-emerald-600' : selectedEmp.saldo < 0 ? 'text-red-600' : 'text-amber-600')}>
                      {formatNumber(selectedEmp.saldo)} <span className="text-sm font-normal">días</span>
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Periodos acumulados */}
              <div>
                <CardHeader className="px-0 pt-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-spartan-primary uppercase tracking-wide">
                    Períodos Acumulados ({empDetail.periodos.length})
                  </CardTitle>
                </CardHeader>
                {empDetail.periodos.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-3">No hay períodos registrados.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-spartan-primary/5">
                          <TableHead>Período</TableHead>
                          <TableHead>Desde</TableHead>
                          <TableHead>Hasta</TableHead>
                          <TableHead className="text-center">Días Trabajados</TableHead>
                          <TableHead className="text-center">Derecho (días)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {empDetail.periodos.map((p) => (
                          <TableRow key={p.id} className="text-sm">
                            <TableCell className="font-medium">{p.anio_label ?? '-'}</TableCell>
                            <TableCell>{formatDate(p.desde)}</TableCell>
                            <TableCell>{formatDate(p.hasta)}</TableCell>
                            <TableCell className="text-center">{p.dias_trabajados ?? '-'}</TableCell>
                            <TableCell className="text-center font-semibold text-spartan-primary">{formatNumber(p.derecho_dias ?? 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="font-bold bg-spartan-primary/10">
                          <TableCell colSpan={4}>TOTAL ACUMULADO</TableCell>
                          <TableCell className="text-center text-spartan-primary">{formatNumber(selectedEmp.total_acumulado)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* Vacaciones tomadas */}
              <div>
                <CardHeader className="px-0 pt-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-spartan-primary uppercase tracking-wide">
                    Vacaciones Tomadas ({empDetail.vacaciones.length})
                  </CardTitle>
                </CardHeader>
                {empDetail.vacaciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-3">No hay vacaciones registradas.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-spartan-primary/5">
                          <TableHead>Desde</TableHead>
                          <TableHead>Hasta</TableHead>
                          <TableHead className="text-center">Días Hábiles</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Autorizado por</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {empDetail.vacaciones.map((v) => (
                          <TableRow key={v.id} className="text-sm">
                            <TableCell>{formatDate(v.fecha_desde)}</TableCell>
                            <TableCell>{formatDate(v.fecha_hasta)}</TableCell>
                            <TableCell className="text-center font-semibold text-blue-600">{formatNumber(v.dias_habiles)}</TableCell>
                            <TableCell className="text-muted-foreground">{v.motivo ?? '-'}</TableCell>
                            <TableCell className="text-muted-foreground">{v.autorizado_por ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="font-bold bg-spartan-primary/10">
                          <TableCell colSpan={2}>TOTAL TOMADOS</TableCell>
                          <TableCell className="text-center text-blue-600">{formatNumber(selectedEmp.total_tomados)}</TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setSelectedEmp(null); setEmpDetail(null) }}>
                  Cerrar
                </Button>
                <Button onClick={exportDetailPDF} className="bg-spartan-primary hover:bg-spartan-primary/90">
                  <FileDown className="mr-2 h-4 w-4" /> Exportar PDF Individual
                </Button>
              </div>

            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
