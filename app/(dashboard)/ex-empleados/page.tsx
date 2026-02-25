'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatNumber } from '@/lib/utils'
import type { ExEmpleado } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { UserPlus, Trash2 } from 'lucide-react'

export default function ExEmpleadosPage() {
  const [exEmpleados, setExEmpleados] = useState<ExEmpleado[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  // Form state
  const [nombre, setNombre] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [diasAcumulados, setDiasAcumulados] = useState('')
  const [diasTomados, setDiasTomados] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('ex_empleados')
      .select('*')
      .order('nombre', { ascending: true })

    if (data) setExEmpleados(data)
    setLoading(false)
  }

  async function handleAdd() {
    if (!nombre.trim()) return
    setSaving(true)
    const acum = parseFloat(diasAcumulados) || 0
    const tom = parseFloat(diasTomados) || 0
    await supabase.from('ex_empleados').insert({
      nombre: nombre.toUpperCase().trim(),
      fecha_ingreso: fechaIngreso || null,
      dias_acumulados: acum,
      dias_tomados: tom,
      saldo: acum - tom,
    })
    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchData()
  }

  async function handleDelete(id: string) {
    await supabase.from('ex_empleados').delete().eq('id', id)
    fetchData()
  }

  function resetForm() {
    setNombre('')
    setFechaIngreso('')
    setDiasAcumulados('')
    setDiasTomados('')
  }

  const saldoCalc = (parseFloat(diasAcumulados) || 0) - (parseFloat(diasTomados) || 0)

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-spartan-primary">Ex-Empleados</h1>
          <p className="text-muted-foreground">{exEmpleados.length} registros</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="bg-spartan-primary hover:bg-spartan-primary/90">
          <UserPlus className="mr-2 h-4 w-4" /> Agregar Ex-Empleado
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-spartan-primary/5">
                  <TableHead className="w-12">N</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead className="text-center">Dias Acumulados</TableHead>
                  <TableHead className="text-center">Dias Tomados</TableHead>
                  <TableHead className="text-center">Saldo</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exEmpleados.map((ex, idx) => (
                  <TableRow key={ex.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{ex.nombre}</TableCell>
                    <TableCell>{formatDate(ex.fecha_ingreso)}</TableCell>
                    <TableCell className="text-center">{formatNumber(ex.dias_acumulados ?? 0)}</TableCell>
                    <TableCell className="text-center">{formatNumber(ex.dias_tomados ?? 0)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={(ex.saldo ?? 0) > 0 ? "bg-green-100 text-green-700 hover:bg-green-100" : (ex.saldo ?? 0) < 0 ? "bg-red-100 text-red-700 hover:bg-red-100" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"}>
                        {formatNumber(ex.saldo ?? 0)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar ex-empleado?</AlertDialogTitle>
                            <AlertDialogDescription>Se eliminara el registro de {ex.nombre}.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(ex.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {exEmpleados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Sin registros de ex-empleados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Agregar Ex-Empleado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Ex-Empleado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="NOMBRE COMPLETO" />
            </div>
            <div>
              <Label>Fecha de Ingreso</Label>
              <Input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dias Acumulados</Label>
                <Input type="number" step="0.5" value={diasAcumulados} onChange={(e) => setDiasAcumulados(e.target.value)} />
              </div>
              <div>
                <Label>Dias Tomados</Label>
                <Input type="number" step="0.5" value={diasTomados} onChange={(e) => setDiasTomados(e.target.value)} />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-sm">
              Saldo calculado: <strong>{formatNumber(saldoCalc)}</strong> dias
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving || !nombre.trim()} className="bg-spartan-primary hover:bg-spartan-primary/90">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
