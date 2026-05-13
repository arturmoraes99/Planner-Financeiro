export const fmt = (v: number): string =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtDate = (iso: string): string => {
  if (!iso) return ''
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export const todayISO = (): string =>
  new Date().toISOString().split('T')[0]

export const getInvoiceMonth = (
  purchaseDateISO: string,
  closingDay: number,
): string => {
  const date = new Date(purchaseDateISO + 'T12:00:00')
  const day  = date.getDate()
  let   m    = date.getMonth()     // 0-based
  let   y    = date.getFullYear()

  // Se compra após fechamento, cai na fatura do próximo mês
  if (day > closingDay) {
    m += 1
    if (m > 11) { m = 0; y += 1 }
  }

  return `${y}-${String(m + 1).padStart(2, '0')}`
}

export const previewInvoiceMonth = (
  dateISO: string,
  closingDay: number,
): string => {
  if (!dateISO) return '—'
  const MONTHS = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ]
  const ym = getInvoiceMonth(dateISO, closingDay)
  const [y, m] = ym.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}
