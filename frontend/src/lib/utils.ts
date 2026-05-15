import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ========== Tailwind Merge Helper ==========
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ========== Formatadores ==========

/** Formata número como moeda BRL: R$ 1.234,56 */
export const fmt = (v: number): string =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Formata ISO date para DD/MM/YYYY */
export const fmtDate = (iso: string): string => {
  if (!iso) return ''
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

// ========== Data Helpers ==========

/** Retorna a data de hoje no formato ISO (YYYY-MM-DD) */
export const todayStr = (): string =>
  new Date().toISOString().split('T')[0]

// Alias para manter compatibilidade se alguém usar todayISO
export const todayISO = todayStr

// ========== Invoice Helpers ==========

/** Calcula o mês da fatura baseado na data da compra e dia de fechamento */
export const getInvoiceMonth = (
  purchaseDateISO: string,
  closingDay: number,
): string => {
  const date = new Date(purchaseDateISO + 'T12:00:00')
  const day  = date.getDate()
  let   m    = date.getMonth()
  let   y    = date.getFullYear()

  if (day > closingDay) {
    m += 1
    if (m > 11) { m = 0; y += 1 }
  }

  return `${y}-${String(m + 1).padStart(2, '0')}`
}

/** Retorna o nome do mês da fatura formatado: "Janeiro 2025" */
export const previewInvoiceMonth = (
  dateISO: string,
  closingDay: number,
): string => {
  if (!dateISO) return '—'
  
  const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  
  const ym = getInvoiceMonth(dateISO, closingDay)
  const [y, m] = ym.split('-')
  
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}
