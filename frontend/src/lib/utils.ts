import { clsx, type ClassValue } from 'clsx'
import { twMerge }               from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(value: number) {
  return (value || 0).toLocaleString('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  })
}

export function fmtDate(s: string) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}
