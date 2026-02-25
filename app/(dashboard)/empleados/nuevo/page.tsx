'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react'

const DEPTO_LABEL: Record<string, string> = { ADMIN: 'Administrativo', COMERCIAL: 'Comercial', FABRICA: 'Fábrica' }

// Auto-formats digits to dd/mm/yyyy as the user types
function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// Converts dd/mm/yyyy display value → ISO yyyy-mm-dd (or '' if incomplete)
function displayToIso(display: string): string {
  const parts = display.split('/')
  if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return ''
}

function DateInput({ value, onChange, id }: { value: string; onChange: (iso: string, display: string) => void; id?: string }) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskDate(e.target.value)
    onChange(displayToIso(masked), masked)
  }
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder="DD/MM/AAAA"
      maxLength={10}
      value={value}
      onChange={handleChange}
    />
  )
}
export default function NuevoEmpleadoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [autoGenerar, setAutoGenerar] = useState(true)
  const [saveStep, setSaveStep] = useState<0 | 1 | 2>(0)

  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [depto, setDepto] = useState('')
  const [nroCuenta, setNroCuenta] = useState('')
  // isoValue stored for DB; displayValue shown in the input
  const [fechaIngreso, setFechaIngreso] = useState('')        // ISO
  const [fechaIngresoDisplay, setFechaIngresoDisplay] = useState('')
  const [fechaIngresoCps, setFechaIngresoCps] = useState('')  // ISO
  const [fechaIngresoCpsDisplay, setFechaIngresoCpsDisplay] = useState('')

  // Step 1: validate then show preview
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    if (!depto) { setError('Seleccione un departamento'); return }
    setError('')
    setSaveStep(1)
  }

  // Final: actually insert to DB
  async function doSave() {
    setSaveStep(0)
    setSaving(true)
    setError('')

    const { data, error: err } = await supabase
      .from('empleados')
      .insert({
        nombre_completo: nombre.toUpperCase().trim(),
        cargo: cargo.toUpperCase().trim() || null,
        departamento: depto,
        nro_cuenta: nroCuenta || null,
        fecha_ingreso: fechaIngreso || null,
        fecha_ingreso_cps: fechaIngresoCps || null,
        activo: true,
      })
      .select()
      .single()

    if (err) {
      setError('Error al guardar: ' + err.message)
      setSaving(false)
      return
    }

    if (data && autoGenerar && (fechaIngreso || fechaIngresoCps)) {
      await supabase.rpc('calcular_siguiente_periodo', { p_emp_id: data.id })
    }

    setSaving(false)
    router.push(`/empleados/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/empleados')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <h1 className="text-2xl font-bold text-spartan-primary">Agregar Nuevo Empleado</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nombre Completo *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="NOMBRE APELLIDO" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cargo</Label>
                <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ej: EJECUTIVO DE VENTAS" />
              </div>
              <div>
                <Label>Departamento *</Label>
                <Select value={depto} onValueChange={setDepto}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrativo</SelectItem>
                    <SelectItem value="COMERCIAL">Comercial</SelectItem>
                    <SelectItem value="FABRICA">Fábrica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Nro. Cuenta</Label>
              <Input type="number" value={nroCuenta} onChange={(e) => setNroCuenta(e.target.value)} placeholder="Opcional" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha de Ingreso</Label>
                <DateInput
                  value={fechaIngresoDisplay}
                  onChange={(iso, display) => { setFechaIngreso(iso); setFechaIngresoDisplay(display) }}
                />
              </div>
              <div>
                <Label>Fecha de Ingreso CPS</Label>
                <DateInput
                  value={fechaIngresoCpsDisplay}
                  onChange={(iso, display) => { setFechaIngresoCps(iso); setFechaIngresoCpsDisplay(display) }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoGenerar"
                checked={autoGenerar}
                onChange={(e) => setAutoGenerar(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="autoGenerar" className="font-normal cursor-pointer">
                Generar períodos de vacación automáticamente
              </Label>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.push('/empleados')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-spartan-primary hover:bg-spartan-primary/90">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Revisar y Guardar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Step 1 — Preview */}
      <Dialog open={saveStep === 1} onOpenChange={(o) => { if (!o) setSaveStep(0) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Confirmar nuevo empleado?</DialogTitle>
            <DialogDescription>Revise los datos antes de guardar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2">
            <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Nombre</span><span className="font-medium">{nombre.toUpperCase().trim()}</span></div>
            <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Cargo</span><span>{cargo.toUpperCase().trim() || '-'}</span></div>
            <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Departamento</span><span>{DEPTO_LABEL[depto] ?? depto}</span></div>
            <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Nro. Cuenta</span><span>{nroCuenta || '-'}</span></div>
            <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Fecha Ingreso</span><span>{fechaIngresoDisplay || '-'}</span></div>
            <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Fecha Ingreso CPS</span><span>{fechaIngresoCpsDisplay || '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Generar períodos</span><span>{autoGenerar ? 'Sí' : 'No'}</span></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSaveStep(0)}>Corregir</Button>
            <Button className="bg-spartan-primary hover:bg-spartan-primary/90" onClick={() => setSaveStep(2)}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2 — Final confirmation */}
      <Dialog open={saveStep === 2} onOpenChange={(o) => { if (!o) setSaveStep(0) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmación final</DialogTitle>
            <DialogDescription>
              ¿Confirma el registro de <strong>{nombre.toUpperCase().trim()}</strong> como nuevo empleado?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSaveStep(1)}>Volver</Button>
            <Button className="bg-spartan-primary hover:bg-spartan-primary/90" onClick={doSave} disabled={saving}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Sí, guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
