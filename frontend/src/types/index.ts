// ── Auth ──────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
}

// ── Transactions ──────────────────────────────────────────────────────
export type TransactionType = 'receita' | 'despesa'

export interface Transaction {
  id: string
  type: TransactionType
  description: string
  amount: number
  category: string
  date: string
  invoiceMonth?: string
  source?: string
  note?: string
  cardId?: string
}

export interface Pagination {
  total: number
  page: number
  totalPages: number
  limit: number
}

export interface TransactionsResponse {
  data: Transaction[]
  total: number
  page: number
  totalPages: number
  limit: number
}

// ── Goals ─────────────────────────────────────────────────────────────
export interface Goal {
  id: string
  name: string
  target: number
  current: number
  deadline: string | null
  icon: string
}

// ── Budget ────────────────────────────────────────────────────────────
export interface Budget {
  id: string
  category: string
  limit: number
  month: string
}

// ── Cards ─────────────────────────────────────────────────────────────
export interface CreditCard {
  id: string
  name: string
  lastDigits: string | null
  limit: number
  closingDay: number
  dueDay: number
  color: string
  icon: string
  invoices: CardInvoice[]
}

export interface CardInvoice {
  id: string
  cardId: string
  month: string
  total: number
  paid: boolean
  paidAt: string | null
  transactions?: Transaction[]
}

// ── Annual Summary ────────────────────────────────────────────────────
export interface MonthlySummary {
  label: string
  month: number
  year: number
  receitas: number
  despesas: number
  saldo: number
}

// ── Settings ──────────────────────────────────────────────────────────
export interface Profile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  createdAt: string
}

export interface Preferences {
  currency: string
  theme: string
  language: string
  notificationsEnabled: boolean
}

// ── Forms ─────────────────────────────────────────────────────────────
export interface TransactionForm {
  type: TransactionType
  description: string
  amount: string
  category: string
  date: string
  note: string
}

export interface CardForm {
  name: string
  lastDigits: string
  limit: string
  closingDay: string
  dueDay: string
  color: string
  icon: string
}

export interface CardTxForm {
  description: string
  amount: string
  category: string
  date: string
  note: string
}

export interface GoalForm {
  name: string
  target: string
  deadline: string
  icon: string
}