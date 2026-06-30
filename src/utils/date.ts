const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function getMonthName(month: number): string {
  return MONTHS[month - 1] || ''
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

export function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  })
}

export function sameMonth(dateStr: string, month: number, year: number): boolean {
  const d = new Date(dateStr)
  return d.getMonth() + 1 === month && d.getFullYear() === year
}

export function getYears(): number[] {
  const current = getCurrentYear()
  const years: number[] = []
  for (let y = current; y >= current - 5; y--) {
    years.push(y)
  }
  return years
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount)
}
