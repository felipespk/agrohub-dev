import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function getGreeting(name?: string): string {
  const hour = new Date().getHours()
  let greeting: string
  if (hour < 12) greeting = 'Bom dia'
  else if (hour < 18) greeting = 'Boa tarde'
  else greeting = 'Boa noite'

  return name ? `${greeting}, ${name}!` : greeting
}

export function getFirstName(fullName?: string | null): string {
  if (!fullName) return ''
  return fullName.split(' ')[0]
}
