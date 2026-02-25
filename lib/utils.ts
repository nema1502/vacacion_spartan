import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFechaIngreso(empleado: { fecha_ingreso: string | null; fecha_ingreso_cps: string | null }): string | null {
  return empleado.fecha_ingreso || empleado.fecha_ingreso_cps
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatNumber(num: number): string {
  return num % 1 === 0 ? num.toString() : num.toFixed(1)
}
