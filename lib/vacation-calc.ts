import { differenceInYears, differenceInMonths, addYears, isAfter, isBefore, getYear, eachDayOfInterval, getDay, isEqual } from 'date-fns'
import type { PeriodoAcumulado } from '@/types'

// Feriados nacionales de Bolivia (fijos)
const FERIADOS_FIJOS = [
  { mes: 0, dia: 1 },   // Año Nuevo
  { mes: 0, dia: 22 },  // Día del Estado Plurinacional
  { mes: 4, dia: 1 },   // Día del Trabajo
  { mes: 7, dia: 6 },   // Día de la Independencia
  { mes: 10, dia: 2 },  // Día de los Difuntos
  { mes: 11, dia: 25 }, // Navidad
]

// Carnaval y Corpus Christi son variables, calculados con Pascua
function calcularPascua(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function getFeriadosVariables(year: number): Date[] {
  const pascua = calcularPascua(year)
  const carnavalLunes = new Date(pascua)
  carnavalLunes.setDate(pascua.getDate() - 48)
  const carnavalMartes = new Date(pascua)
  carnavalMartes.setDate(pascua.getDate() - 47)
  const viernesSanto = new Date(pascua)
  viernesSanto.setDate(pascua.getDate() - 2)
  const corpusChristi = new Date(pascua)
  corpusChristi.setDate(pascua.getDate() + 60)
  return [carnavalLunes, carnavalMartes, viernesSanto, corpusChristi]
}

function esFeriado(date: Date): boolean {
  const year = date.getFullYear()
  const mes = date.getMonth()
  const dia = date.getDate()

  for (const f of FERIADOS_FIJOS) {
    if (f.mes === mes && f.dia === dia) return true
  }

  const variables = getFeriadosVariables(year)
  for (const fv of variables) {
    if (fv.getMonth() === mes && fv.getDate() === dia) return true
  }

  return false
}

export function calcularAntiguedad(fechaIngreso: Date, hoy?: Date): { anos: number; meses: number } {
  const referencia = hoy || new Date()
  const anos = differenceInYears(referencia, fechaIngreso)
  const meses = differenceInMonths(referencia, fechaIngreso) % 12
  return { anos: Math.max(0, anos), meses: Math.max(0, meses) }
}

export function calcularDiasVacacionPorAno(anos: number): number {
  if (anos < 1) return 0
  if (anos <= 5) return 15   // Art. 33-36 LGT: años 1-5 → 15 días
  if (anos <= 10) return 20  // años 6-10 → 20 días
  return 30                  // años 11+ → 30 días
}

export function calcularTotalAcumulado(periodos: PeriodoAcumulado[]): number {
  return periodos.reduce((sum, p) => sum + (p.derecho_dias || 0), 0)
}

export function calcularSaldo(acumulado: number, tomados: number): number {
  return acumulado - tomados
}

export function generarPeriodosAuto(fechaIngreso: Date, hoy: Date): Omit<PeriodoAcumulado, 'id' | 'empleado_id' | 'created_at'>[] {
  const periodos: Omit<PeriodoAcumulado, 'id' | 'empleado_id' | 'created_at'>[] = []
  let anioNum = 1
  let inicio = new Date(fechaIngreso)

  while (true) {
    const fin = addYears(inicio, 1)
    const finAjustado = new Date(fin)
    finAjustado.setDate(finAjustado.getDate() - 1)

    if (isAfter(fin, hoy)) break

    const diasDerecho = calcularDiasVacacionPorAno(anioNum)

    periodos.push({
      anio_label: `Año ${anioNum}`,
      desde: inicio.toISOString().split('T')[0],
      hasta: finAjustado.toISOString().split('T')[0],
      dias_trabajados: 360,
      derecho_dias: diasDerecho,
    })

    inicio = fin
    anioNum++
  }

  return periodos
}

export function calcularDiasHabiles(desde: Date, hasta: Date): number {
  if (isAfter(desde, hasta)) return 0

  const days = eachDayOfInterval({ start: desde, end: hasta })
  let habiles = 0

  for (const day of days) {
    const dayOfWeek = getDay(day) // 0=domingo, 6=sábado
    if (dayOfWeek === 0) continue // Domingo: no cuenta
    if (esFeriado(day)) continue
    if (dayOfWeek === 6) {
      habiles += 0.5 // Sábado: medio día hábil
    } else {
      habiles++
    }
  }

  return habiles
}

export function getEscalaTexto(anos: number): string {
  if (anos < 1) return 'Sin derecho (menos de 1 año)'
  if (anos <= 5) return '15 días/año (1-5 años)'
  if (anos <= 10) return '20 días/año (6-10 años)'
  return '30 días/año (11+ años)'
}
