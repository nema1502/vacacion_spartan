export interface Empleado {
  id: number
  numero: number | null
  nombre_completo: string
  cargo: string | null
  departamento: string | null
  nro_cuenta: string | null
  fecha_ingreso: string | null
  fecha_ingreso_cps: string | null
  antiguedad_anios: number
  dias_vacacion_anio: number
  activo: boolean
  created_at?: string
  updated_at?: string
  periodos_vacacion?: PeriodoVacacion[]
  vacaciones_tomadas?: VacacionTomada[]
}

export interface PeriodoVacacion {
  id: number
  empleado_id: number
  anio_label: string | null
  desde: string | null
  hasta: string | null
  dias_trabajados: number | null
  derecho_dias: number | null
  created_at?: string
}

// Legacy alias so vacation-calc.ts stays compatible
export type PeriodoAcumulado = PeriodoVacacion

export interface VacacionTomada {
  id: number
  empleado_id: number
  fecha_desde: string
  fecha_hasta: string | null
  motivo: string | null
  dias_habiles: number
  autorizado_por: string | null
  created_at?: string
}

export interface ExEmpleado {
  id: string
  nombre: string
  fecha_ingreso: string | null
  dias_acumulados: number | null
  dias_tomados: number | null
  saldo: number | null
  created_at?: string
}

export interface EmpleadoResumen extends Empleado {
  total_acumulado: number
  total_tomados: number
  saldo: number
  antiguedad_anos: number
  antiguedad_meses: number
  dias_por_ano: number
}
