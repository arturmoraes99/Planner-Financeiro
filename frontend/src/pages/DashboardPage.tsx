import { useState, useEffect, useCallback, memo, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api }     from '@/api/client'
import { fmt, fmtDate, todayStr } from '@/lib/utils'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Transaction {
  id:            string
  type:          string
  description:   string
  amount:        number
  category:      string
  date:          string
  invoiceMonth?: string
  source?:       string
  note?:         string
  cardId?:       string
}

interface Goal {
  id:       string
  name:     string
  target:   number
  current:  number
  deadline: string | null
  icon:     string
}

interface Budget {
  id:       string
  category: string
  limit:    number
  month:    string
}

interface MonthlySummary {
  label:    string
  month:    number
  year:     number
  receitas: number
  despesas: number
  saldo:    number
}

interface Pagination {
  total:      number
  page:       number
  totalPages: number
  limit:      number
}

interface CreditCard {
  id:         string
  name:       string
  lastDigits: string | null
  limit:      number
  closingDay: number
  dueDay:     number
  color:      string
  icon:       string
  invoices:   CardInvoice[]
}

interface CardInvoice {
  id:            string
  cardId:        string
  month:         string
  total:         number
  paid:          boolean
  paidAt:        string | null
  transactions?: Transaction[]
}

// ── Constantes ─────────────────────────────────────────────────────────────
const CATS = {
  receita: ['Salário','Freelance','13º / Férias','Aluguel Recebido','Investimentos','Presente','Reembolso','Outros'],
  despesa: ['Moradia','Alimentação','Transporte','Saúde','Educação','Lazer','Assinaturas','Roupas','Eletrônicos','Viagem','Cartão de Crédito','Outros'],
}

const COLORS: Record<string, string> = {
  'Moradia':           '#3b82f6',
  'Alimentação':       '#f59e0b',
  'Transporte':        '#8b5cf6',
  'Saúde':             '#ef4444',
  'Educação':          '#06b6d4',
  'Lazer':             '#f97316',
  'Assinaturas':       '#ec4899',
  'Roupas':            '#a78bfa',
  'Eletrônicos':       '#67e8f9',
  'Viagem':            '#34d399',
  'Cartão de Crédito': '#fb7185',
  'Outros':            '#64748b',
  'Salário':           '#22c55e',
  'Freelance':         '#4ade80',
  '13º / Férias':      '#86efac',
  'Aluguel Recebido':  '#6ee7b7',
  'Investimentos':     '#34d399',
  'Presente':          '#a7f3d0',
  'Reembolso':         '#d1fae5',
}

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const DESPESA_CATS = CATS.despesa

const CARD_COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#ef4444','#f59e0b',
  '#22c55e','#06b6d4','#f97316','#64748b','#1e3a5f',
]
const CARD_ICONS = ['💳','🔵','🟣','⚫','🥇','💎','🌟','🦁','🐉','🚀']

// ── Parsers ────────────────────────────────────────────────────────────────
function parseOFX(content: string) {
  const rows: any[]     = []
  const stmtRegex       = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match
  while ((match = stmtRegex.exec(content)) !== null) {
    const block  = match[1]
    const getTag = (tag: string) => {
      const r = new RegExp(`<${tag}>([^<\n\r]+)`, 'i')
      const m = block.match(r)
      return m ? m[1].trim() : ''
    }
    const dtRaw  = getTag('DTPOSTED')
    const amount = parseFloat(getTag('TRNAMT').replace(',', '.'))
    const memo   = getTag('MEMO') || getTag('NAME') || 'Sem descrição'
    if (isNaN(amount)) continue
    let dateStr = todayStr()
    if (dtRaw.length >= 8) {
      const [y, m, d] = [dtRaw.slice(0,4), dtRaw.slice(4,6), dtRaw.slice(6,8)]
      dateStr = `${y}-${m}-${d}`
    }
    rows.push({
      desc: memo,
      valor: Math.abs(amount),
      tipo:  amount >= 0 ? 'receita' : 'despesa',
      data:  dateStr,
      cat:   'Outros',
    })
  }
  return rows
}

function parseCSV(content: string) {
  const rows: any[] = []
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return rows
  const sep     = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].toLowerCase().split(sep).map(h => h.replace(/"/g, '').trim())
  const iDate   = headers.findIndex(h => ['data','date','dt'].includes(h))
  const iDesc   = headers.findIndex(h => ['descricao','descrição','description','memo','historico','histórico','nome','name'].includes(h))
  const iVal    = headers.findIndex(h => ['valor','value','amount','vlr','montante'].includes(h))
  if (iDate === -1 || iDesc === -1 || iVal === -1) return rows
  lines.slice(1).forEach(line => {
    const cols   = line.split(sep).map(c => c.replace(/"/g, '').trim())
    const rawVal = cols[iVal]?.replace('.', '').replace(',', '.')
    const valor  = parseFloat(rawVal)
    const desc   = cols[iDesc]
    if (!desc || isNaN(valor)) return
    const raw = cols[iDate]
    let dateStr = todayStr()
    if (raw?.includes('/')) {
      const [d, m, y] = raw.split('/')
      if (y?.length === 4) dateStr = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    } else if (raw?.includes('-')) {
      dateStr = raw
    }
    rows.push({
      desc,
      valor: Math.abs(valor),
      tipo:  valor >= 0 ? 'receita' : 'despesa',
      data:  dateStr,
      cat:   'Outros',
    })
  })
  return rows
}

// ── Gráfico Anual (fora do componente principal — sem re-render desnecessário)
const AnnualChart = memo(({ annualData }: { annualData: MonthlySummary[] }) => {
  if (!annualData.length)
    return <div className="text-slate-500 text-sm text-center py-8">Sem dados.</div>

  const W = 860, H = 200, PL = 60, PR = 20, PT = 16, PB = 36
  const iW = W - PL - PR
  const iH = H - PT - PB

  const allV  = annualData.flatMap(d => [d.receitas, d.despesas, Math.abs(d.saldo)])
  const maxV  = Math.max(...allV, 1)
  const minV  = Math.min(...annualData.map(d => d.saldo), 0)
  const range = maxV - minV || 1

  const xP = (i: number) => PL + (i / Math.max(annualData.length - 1, 1)) * iW
  const yP = (v: number) => PT + iH - ((v - minV) / range) * iH

  const makePath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xP(i).toFixed(1)} ${yP(v).toFixed(1)}`).join(' ')

  const lines: { values: number[]; color: string; label: string }[] = [
    { values: annualData.map(d => d.receitas), color: '#22c55e', label: '● Receitas' },
    { values: annualData.map(d => d.despesas), color: '#ef4444', label: '● Despesas' },
    { values: annualData.map(d => d.saldo),    color: '#3b82f6', label: '● Saldo'    },
  ]

  const gridCount = 5
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const yy  = PT + (iH / (gridCount - 1)) * i
    const val = maxV - (range / (gridCount - 1)) * i
    return { yy, val }
  })

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 500 }}>
        {/* Grid lines */}
        {gridLines.map(({ yy, val }) => (
          <g key={yy}>
            <line x1={PL} y1={yy} x2={PL + iW} y2={yy} stroke="#ffffff10" strokeWidth="1"/>
            <text x={PL - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="#64748b">
              {(val / 1000).toFixed(0)}k
            </text>
          </g>
        ))}

        {/* Data lines + dots */}
        {lines.map(({ values, color }) => (
          <g key={color}>
            <path d={makePath(values)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
            {values.map((v, i) => (
              <circle key={i} cx={xP(i)} cy={yP(v)} r="4" fill={color} stroke="#1a2235" strokeWidth="2"/>
            ))}
          </g>
        ))}

        {/* X labels */}
        {annualData.map((d, i) => (
          <text key={i} x={xP(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#64748b">
            {d.label}
          </text>
        ))}
      </svg>

      <div className="flex gap-5 mt-3 text-xs">
        {lines.map(({ color, label }) => (
          <span key={label} style={{ color }}>{label}</span>
        ))}
      </div>
    </div>
  )
})

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { user, logout } = useAuth()

  // ── Navegação ──────────────────────────────────────────────────────────────
  const [page,         setPage]         = useState('dashboard')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear,  setCurrentYear]  = useState(new Date().getFullYear())
  const [mobileMenu,   setMobileMenu]   = useState(false)

  // ── Dados principais ───────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals,        setGoals]        = useState<Goal[]>([])
  const [budgets,      setBudgets]      = useState<Budget[]>([])
  const [annualData,   setAnnualData]   = useState<MonthlySummary[]>([])
  const [pagination,   setPagination]   = useState<Pagination>({ total:0, page:1, totalPages:1, limit:50 })
  const [loadingData,  setLoadingData]  = useState(false)
  const [currentPage,  setCurrentPage]  = useState(1)

  // ── Form transação ─────────────────────────────────────────────────────────
  const [tab,    setTab]    = useState<'receita' | 'despesa'>('receita')
  const [fDesc,  setFDesc]  = useState('')
  const [fValor, setFValor] = useState('')
  const [fCat,   setFCat]   = useState(CATS.receita[0])
  const [fData,  setFData]  = useState(todayStr())
  const [fObs,   setFObs]   = useState('')
  const [saving, setSaving] = useState(false)

  // ── Modal editar transação ─────────────────────────────────────────────────
  const [editingTx,  setEditingTx]  = useState<Transaction | null>(null)
  const [editDesc,   setEditDesc]   = useState('')
  const [editValor,  setEditValor]  = useState('')
  const [editCat,    setEditCat]    = useState('')
  const [editData,   setEditData]   = useState('')
  const [editObs,    setEditObs]    = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // ── Form meta ──────────────────────────────────────────────────────────────
  const [mNome,  setMNome]  = useState('')
  const [mAlvo,  setMAlvo]  = useState('')
  const [mPrazo, setMPrazo] = useState('')
  const [mIcon,  setMIcon]  = useState('🎯')

  // ── Orçamento ──────────────────────────────────────────────────────────────
  const [budgetCat,   setBudgetCat]   = useState(DESPESA_CATS[0])
  const [budgetLimit, setBudgetLimit] = useState('')

  // ── Importação ─────────────────────────────────────────────────────────────
  const [importRows,         setImportRows]         = useState<any[]>([])
  const [importChecked,      setImportChecked]      = useState<boolean[]>([])
  const [importCats,         setImportCats]         = useState<string[]>([])
  const [importInvoiceMonth, setImportInvoiceMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // ── Modal aporte ───────────────────────────────────────────────────────────
  const [modalGoalId, setModalGoalId] = useState<string | null>(null)
  const [aporteValor, setAporteValor] = useState('')

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ msg: '', type: '', visible: false })

  // ── Filtro ─────────────────────────────────────────────────────────────────
  const [filterTipo, setFilterTipo] = useState('all')

  // ── Cartões ────────────────────────────────────────────────────────────────
  const [cards,           setCards]           = useState<CreditCard[]>([])
  const [selectedCard,    setSelectedCard]    = useState<CreditCard | null>(null)
  const [cardInvoices,    setCardInvoices]    = useState<(CardInvoice & { transactions: Transaction[] })[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [openInvoice,     setOpenInvoice]     = useState<string | null>(null)

  const [cardForm, setCardForm] = useState({
    name: '', lastDigits: '', limit: '', closingDay: '10', dueDay: '20', color: '#3b82f6', icon: '💳',
  })
  const [cardFormOpen, setCardFormOpen] = useState(false)
  const [editingCard,  setEditingCard]  = useState<CreditCard | null>(null)
  const [savingCard,   setSavingCard]   = useState(false)

  const [cardTxForm, setCardTxForm] = useState({
    description: '', amount: '', category: CATS.despesa[0], date: todayStr(), note: '',
  })
  const [cardTxOpen,   setCardTxOpen]   = useState(false)
  const [savingCardTx, setSavingCardTx] = useState(false)

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, type = 'ok') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800)
  }, [])

  const yearMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  // ── Preview mês fatura ─────────────────────────────────────────────────────
  const previewInvoiceMonth = useCallback((date: string, closingDay: number): string => {
    if (!date) return ''
    const [y, m, d] = date.split('-').map(Number)
    if (d > closingDay) {
      const next = new Date(y, m, 1)
      return `${MONTHS[next.getMonth()]} ${next.getFullYear()}`
    }
    return `${MONTHS[m - 1]} ${y}`
  }, [])

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadTransactions = useCallback(async (pg = 1) => {
    setLoadingData(true)
    try {
      const { data } = await api.get('/transactions', {
        params: { year: currentYear, month: currentMonth + 1, page: pg, limit: 20 },
      })
      setTransactions(data.data)
      setPagination({ total: data.total, page: data.page, totalPages: data.totalPages, limit: data.limit })
      setCurrentPage(pg)
    } catch {
      showToast('Erro ao carregar transações.', 'err')
    } finally {
      setLoadingData(false)
    }
  }, [currentYear, currentMonth, showToast])

  const loadGoals = useCallback(async () => {
    try {
      const { data } = await api.get('/goals')
      setGoals(data)
    } catch { /* silencioso */ }
  }, [])

  const loadBudgets = useCallback(async () => {
    try {
      const { data } = await api.get('/budgets', { params: { month: yearMonthStr } })
      setBudgets(data)
    } catch { /* silencioso */ }
  }, [yearMonthStr])

  const loadAnnual = useCallback(async () => {
    try {
      const { data } = await api.get('/transactions/summary')
      setAnnualData(data)
    } catch { /* silencioso */ }
  }, [])

  const loadCards = useCallback(async () => {
    try {
      const { data } = await api.get('/cards')
      setCards(data)
    } catch { /* silencioso */ }
  }, [])

  const loadInvoices = useCallback(async (cardId: string) => {
    setLoadingInvoices(true)
    try {
      const { data } = await api.get(`/cards/${cardId}/invoices`)
      setCardInvoices(data)
    } catch {
      showToast('Erro ao carregar faturas.', 'err')
    } finally {
      setLoadingInvoices(false)
    }
  }, [showToast])

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTransactions(1)
    loadAnnual()
    loadBudgets()
    loadCards()
  }, [loadTransactions, loadAnnual, loadBudgets, loadCards])

  useEffect(() => { if (page === 'metas')     loadGoals()   }, [page, loadGoals])
  useEffect(() => { if (page === 'orcamento') loadBudgets() }, [page, loadBudgets])
  useEffect(() => { if (page === 'cartoes')   loadCards()   }, [page, loadCards])

  // ── Mês ────────────────────────────────────────────────────────────────────
  const changeMonth = (dir: number) => {
    let m = currentMonth + dir
    let y = currentYear
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setCurrentMonth(m)
    setCurrentYear(y)
  }

  // ── CRUD Transação ─────────────────────────────────────────────────────────
  const addTransaction = async () => {
    if (!fDesc.trim())                    return showToast('Informe a descrição!', 'err')
    if (!fValor || parseFloat(fValor)<=0) return showToast('Informe um valor válido!', 'err')
    if (!fData)                           return showToast('Informe a data!', 'err')
    setSaving(true)
    try {
      await api.post('/transactions', {
        type: tab, description: fDesc, amount: parseFloat(fValor),
        category: fCat, date: fData, note: fObs || undefined,
      })
      setFDesc(''); setFValor(''); setFObs('')
      showToast(tab === 'receita' ? '📥 Receita adicionada!' : '📤 Despesa adicionada!', 'ok')
      await loadTransactions(1)
      await loadAnnual()
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Erro ao salvar.', 'err')
    } finally {
      setSaving(false)
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      await api.delete(`/transactions/${id}`)
      showToast('🗑 Removido', 'info')
      await loadTransactions(currentPage)
      await loadAnnual()
    } catch {
      showToast('Erro ao remover.', 'err')
    }
  }

  const openEdit = (t: Transaction) => {
    setEditingTx(t)
    setEditDesc(t.description)
    setEditValor(String(t.amount))
    setEditCat(t.category)
    setEditData(t.date)
    setEditObs(t.note || '')
  }

  const saveEdit = async () => {
    if (!editingTx) return
    if (!editDesc.trim())                       return showToast('Informe a descrição!', 'err')
    if (!editValor || parseFloat(editValor)<=0) return showToast('Informe um valor válido!', 'err')
    setEditSaving(true)
    try {
      await api.put(`/transactions/${editingTx.id}`, {
        type: editingTx.type, description: editDesc,
        amount: parseFloat(editValor), category: editCat, date: editData, note: editObs || null,
      })
      setEditingTx(null)
      showToast('✏️ Transação atualizada!', 'ok')
      await loadTransactions(currentPage)
      await loadAnnual()
    } catch {
      showToast('Erro ao atualizar.', 'err')
    } finally {
      setEditSaving(false)
    }
  }

  // ── CRUD Meta ──────────────────────────────────────────────────────────────
  const addMeta = async () => {
    if (!mNome.trim())                   return showToast('Informe o nome!', 'err')
    if (!mAlvo || parseFloat(mAlvo)<=0) return showToast('Informe o valor alvo!', 'err')
    try {
      await api.post('/goals', {
        name: mNome, target: parseFloat(mAlvo), deadline: mPrazo || undefined, icon: mIcon,
      })
      setMNome(''); setMAlvo(''); setMPrazo('')
      showToast('🎯 Meta criada!', 'ok')
      await loadGoals()
    } catch {
      showToast('Erro ao criar meta.', 'err')
    }
  }

  const deleteMeta = async (id: string) => {
    try {
      await api.delete(`/goals/${id}`)
      showToast('🗑 Meta removida', 'info')
      await loadGoals()
    } catch {
      showToast('Erro ao remover meta.', 'err')
    }
  }

  const confirmarAporte = async () => {
    if (!aporteValor || parseFloat(aporteValor)<=0) return showToast('Informe o valor!', 'err')
    try {
      await api.patch(`/goals/${modalGoalId}/contribution`, { amount: parseFloat(aporteValor) })
      setModalGoalId(null)
      setAporteValor('')
      showToast('💰 Aporte registrado!', 'ok')
      await loadGoals()
    } catch {
      showToast('Erro ao registrar aporte.', 'err')
    }
  }

  // ── Orçamento ──────────────────────────────────────────────────────────────
  const saveBudget = async () => {
    if (!budgetLimit || parseFloat(budgetLimit)<=0) return showToast('Informe o limite!', 'err')
    try {
      await api.post('/budgets', {
        category: budgetCat, limit: parseFloat(budgetLimit), month: yearMonthStr,
      })
      setBudgetLimit('')
      showToast('💰 Orçamento salvo!', 'ok')
      await loadBudgets()
    } catch {
      showToast('Erro ao salvar orçamento.', 'err')
    }
  }

  const deleteBudget = async (id: string) => {
    try {
      await api.delete(`/budgets/${id}`)
      showToast('🗑 Orçamento removido', 'info')
      await loadBudgets()
    } catch {
      showToast('Erro ao remover.', 'err')
    }
  }

  // ── Cartões ────────────────────────────────────────────────────────────────
  const saveCard = async () => {
    if (!cardForm.name.trim())                             return showToast('Informe o nome!', 'err')
    if (!cardForm.limit || parseFloat(cardForm.limit)<=0)  return showToast('Informe o limite!', 'err')
    setSavingCard(true)
    try {
      if (editingCard) {
        await api.put(`/cards/${editingCard.id}`, cardForm)
        showToast('✏️ Cartão atualizado!', 'ok')
      } else {
        await api.post('/cards', cardForm)
        showToast('💳 Cartão criado!', 'ok')
      }
      setCardFormOpen(false)
      setEditingCard(null)
      setCardForm({ name:'', lastDigits:'', limit:'', closingDay:'10', dueDay:'20', color:'#3b82f6', icon:'💳' })
      await loadCards()
    } catch {
      showToast('Erro ao salvar cartão.', 'err')
    } finally {
      setSavingCard(false)
    }
  }

  const deleteCard = async (id: string) => {
    try {
      await api.delete(`/cards/${id}`)
      if (selectedCard?.id === id) { setSelectedCard(null); setCardInvoices([]) }
      showToast('🗑 Cartão removido.', 'info')
      await loadCards()
    } catch {
      showToast('Erro ao remover cartão.', 'err')
    }
  }

  const openEditCard = (card: CreditCard) => {
    setEditingCard(card)
    setCardForm({
      name:       card.name,
      lastDigits: card.lastDigits || '',
      limit:      String(card.limit),
      closingDay: String(card.closingDay),
      dueDay:     String(card.dueDay),
      color:      card.color,
      icon:       card.icon,
    })
    setCardFormOpen(true)
  }

  const addCardTx = async () => {
    if (!selectedCard)                                           return showToast('Selecione um cartão!', 'err')
    if (!cardTxForm.description.trim())                          return showToast('Informe a descrição!', 'err')
    if (!cardTxForm.amount || parseFloat(cardTxForm.amount)<=0)  return showToast('Informe o valor!', 'err')
    setSavingCardTx(true)
    try {
      await api.post(`/cards/${selectedCard.id}/transactions`, cardTxForm)
      setCardTxOpen(false)
      setCardTxForm({ description:'', amount:'', category: CATS.despesa[0], date: todayStr(), note:'' })
      showToast('💳 Lançamento adicionado!', 'ok')
      await loadInvoices(selectedCard.id)
      await loadCards()
    } catch {
      showToast('Erro ao lançar no cartão.', 'err')
    } finally {
      setSavingCardTx(false)
    }
  }

  const payInvoice = async (cardId: string, month: string) => {
    try {
      await api.patch(`/cards/${cardId}/invoices/${month}/pay`, {})
      showToast('✅ Fatura marcada como paga!', 'ok')
      await loadInvoices(cardId)
    } catch {
      showToast('Erro ao pagar fatura.', 'err')
    }
  }

  const selectCard = (card: CreditCard) => {
    setSelectedCard(card)
    setOpenInvoice(null)
    loadInvoices(card.id)
  }

  // ── Importação ─────────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    const ext    = file.name.split('.').pop()?.toLowerCase()
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      let rows: any[] = []
      if      (ext === 'ofx' || ext === 'qfx') rows = parseOFX(content)
      else if (ext === 'csv')                   rows = parseCSV(content)
      else { showToast('Formato não suportado.', 'err'); return }
      if (!rows.length) { showToast('Nenhuma transação encontrada.', 'err'); return }
      setImportRows(rows)
      setImportChecked(rows.map(() => true))
      setImportCats(rows.map(r => r.cat || 'Outros'))
      showToast(`📥 ${rows.length} transações encontradas!`, 'ok')
    }
    reader.readAsText(file, 'latin1')
  }

  // ✅ Bug de índice corrigido — mantemos o índice original antes de filtrar
  const confirmImport = async () => {
    const toImport = importRows
      .map((r, i) => ({ ...r, _checked: importChecked[i], cat: importCats[i] ?? 'Outros' }))
      .filter(r => r._checked)
      .map(({ _checked, ...r }) => r)

    if (!toImport.length)    return showToast('Selecione ao menos uma.', 'err')
    if (!importInvoiceMonth) return showToast('Selecione o mês da fatura!', 'err')
    try {
      const { data } = await api.post('/transactions/bulk', {
        transactions: toImport,
        invoiceMonth: importInvoiceMonth,
      })
      showToast(`✅ ${data.count} transações importadas!`, 'ok')
      setImportRows([])
      setImportChecked([])
      setImportCats([])
      await loadTransactions(1)
      await loadAnnual()
    } catch {
      showToast('Erro ao importar.', 'err')
    }
  }

  // ── PDF ────────────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default
    const recs   = transactions.filter(t => t.type === 'receita')
    const desps  = transactions.filter(t => t.type === 'despesa')
    const totR   = recs.reduce((s, t)  => s + t.amount, 0)
    const totD   = desps.reduce((s, t) => s + t.amount, 0)
    const saldo  = totR - totD
    const mesAno = `${MONTHS[currentMonth]} ${currentYear}`

    const catMap: Record<string, number> = {}
    desps.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })

    const tableRows = (items: Transaction[]) =>
      [...items]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(t =>
          `<tr>
            <td>${fmtDate(t.date)}</td>
            <td>${t.description}</td>
            <td>${t.category}</td>
            <td style="text-align:right;font-weight:600">${fmt(t.amount)}</td>
          </tr>`,
        )
        .join('')

    const el = document.createElement('div')
    el.style.cssText = 'background:#fff;color:#111;padding:32px;font-family:Segoe UI,sans-serif;width:794px'
    el.innerHTML = `
      <h1 style="font-size:1.4rem;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:8px;margin-bottom:16px">
        💰 Planner Financeiro Pro — ${mesAno}
      </h1>
      <p style="font-size:.8rem;color:#64748b;margin-bottom:20px">
        Gerado em ${new Date().toLocaleDateString('pt-BR')} por ${user?.name}
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:24px">
        <div style="background:#f0fdf4;border-radius:8px;padding:12px;border-left:4px solid #22c55e">
          <div style="font-size:.7rem;color:#666;text-transform:uppercase">Receitas</div>
          <div style="font-size:1.2rem;font-weight:800;color:#16a34a">${fmt(totR)}</div>
        </div>
        <div style="background:#fef2f2;border-radius:8px;padding:12px;border-left:4px solid #ef4444">
          <div style="font-size:.7rem;color:#666;text-transform:uppercase">Despesas</div>
          <div style="font-size:1.2rem;font-weight:800;color:#dc2626">${fmt(totD)}</div>
        </div>
        <div style="background:#eff6ff;border-radius:8px;padding:12px;border-left:4px solid #3b82f6">
          <div style="font-size:.7rem;color:#666;text-transform:uppercase">Saldo</div>
          <div style="font-size:1.2rem;font-weight:800;color:${saldo>=0?'#1d4ed8':'#dc2626'}">${fmt(saldo)}</div>
        </div>
        <div style="background:#fefce8;border-radius:8px;padding:12px;border-left:4px solid #f59e0b">
          <div style="font-size:.7rem;color:#666;text-transform:uppercase">Comprometido</div>
          <div style="font-size:1.2rem;font-weight:800;color:#d97706">${totR>0?(totD/totR*100).toFixed(1):0}%</div>
        </div>
      </div>
      <h2 style="font-size:1rem;color:#1e3a5f;margin:16px 0 8px">📥 Receitas</h2>
      <table style="width:100%;border-collapse:collapse;font-size:.82rem">
        <tr style="background:#1e3a5f;color:#fff">
          <th style="padding:7px 10px;text-align:left">Data</th>
          <th style="padding:7px 10px;text-align:left">Descrição</th>
          <th style="padding:7px 10px;text-align:left">Categoria</th>
          <th style="padding:7px 10px;text-align:right">Valor</th>
        </tr>
        ${recs.length ? tableRows(recs) : '<tr><td colspan="4" style="text-align:center;padding:8px;color:#999">Nenhuma receita</td></tr>'}
        <tr style="background:#f0fdf4">
          <td colspan="3" style="padding:7px 10px;font-weight:700">Total Receitas</td>
          <td style="text-align:right;padding:7px 10px;font-weight:800;color:#16a34a">${fmt(totR)}</td>
        </tr>
      </table>
      <h2 style="font-size:1rem;color:#1e3a5f;margin:16px 0 8px">📤 Despesas</h2>
      <table style="width:100%;border-collapse:collapse;font-size:.82rem">
        <tr style="background:#1e3a5f;color:#fff">
          <th style="padding:7px 10px;text-align:left">Data</th>
          <th style="padding:7px 10px;text-align:left">Descrição</th>
          <th style="padding:7px 10px;text-align:left">Categoria</th>
          <th style="padding:7px 10px;text-align:right">Valor</th>
        </tr>
        ${desps.length ? tableRows(desps) : '<tr><td colspan="4" style="text-align:center;padding:8px;color:#999">Nenhuma despesa</td></tr>'}
        <tr style="background:#fef2f2">
          <td colspan="3" style="padding:7px 10px;font-weight:700">Total Despesas</td>
          <td style="text-align:right;padding:7px 10px;font-weight:800;color:#dc2626">${fmt(totD)}</td>
        </tr>
      </table>
      <h2 style="font-size:1rem;color:#1e3a5f;margin:16px 0 8px">🍩 Por Categoria</h2>
      <table style="width:100%;border-collapse:collapse;font-size:.82rem">
        <tr style="background:#1e3a5f;color:#fff">
          <th style="padding:7px 10px;text-align:left">Categoria</th>
          <th style="padding:7px 10px;text-align:right">Total</th>
          <th style="padding:7px 10px;text-align:right">%</th>
        </tr>
        ${Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([c,v])=>
          `<tr>
            <td style="padding:6px 10px">${c}</td>
            <td style="text-align:right;padding:6px 10px">${fmt(v)}</td>
            <td style="text-align:right;padding:6px 10px">${totD>0?(v/totD*100).toFixed(1):0}%</td>
          </tr>`,
        ).join('')}
      </table>
      <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:.72rem;color:#999;text-align:center">
        Planner Financeiro Pro · Exportado em ${new Date().toLocaleString('pt-BR')}
      </div>
    `

    document.body.appendChild(el)
    await html2pdf()
      .set({
        margin:     [10, 10, 10, 10],
        filename:   `planner-${MONTHS[currentMonth].toLowerCase()}-${currentYear}.pdf`,
        image:      { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2 },
        jsPDF:      { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(el)
      .save()
    document.body.removeChild(el)
    showToast('📄 PDF exportado!', 'ok')
  }

  // ── Cálculos (memoizados) ──────────────────────────────────────────────────
  const recs  = useMemo(() => transactions.filter(t => t.type === 'receita'), [transactions])
  const desps = useMemo(() => transactions.filter(t => t.type === 'despesa'), [transactions])
  const totR  = useMemo(() => recs.reduce((s, t)  => s + t.amount, 0), [recs])
  const totD  = useMemo(() => desps.reduce((s, t) => s + t.amount, 0), [desps])
  const saldo = totR - totD
  const pct   = totR > 0 ? Math.min((totD / totR) * 100, 100) : 0

  const catEntries = useMemo(() => {
    const catMap: Record<string, number> = {}
    desps.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })
    return Object.entries(catMap).sort((a, b) => b[1] - a[1])
  }, [desps])

  const filteredList = useMemo(
    () => filterTipo === 'all' ? transactions : transactions.filter(t => t.type === filterTipo),
    [transactions, filterTipo],
  )

  const budgetSpending = useMemo(() => {
    const map: Record<string, number> = {}
    desps.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return map
  }, [desps])

  // ── Estilos base ───────────────────────────────────────────────────────────
  const cardBase   = 'rounded-2xl p-6 border border-white/10'
  const cardStyle  = { background: '#1a2235' }
  const inputStyle = { background: '#0a0f1e', color: '#e2e8f0', border: '1px solid #334155' }

  const navItems = [
    { id: 'dashboard',    label: 'Dashboard',  icon: '📊' },
    { id: 'transactions', label: 'Lançamentos', icon: '💳' },
    { id: 'orcamento',    label: 'Orçamento',   icon: '🎚️' },
    { id: 'cartoes',      label: 'Cartões',     icon: '🃏' },
    { id: 'metas',        label: 'Metas',       icon: '🎯' },
    { id: 'import',       label: 'Importar',    icon: '📥' },
    { id: 'relatorio',    label: 'Relatório',   icon: '📄' },
  ]

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e' }}>

      {/* ── TOAST ── */}
      {toast.visible && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl font-bold text-sm shadow-xl
          ${toast.type === 'ok'  ? 'bg-green-900 text-green-300 border border-green-500' :
            toast.type === 'err' ? 'bg-red-900 text-red-300 border border-red-500' :
            'bg-slate-800 text-slate-300 border border-slate-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── MODAL EDITAR TRANSAÇÃO ── */}
      {editingTx && (
        <div className="fixed inset-0 bg-black/75 z-40 flex items-center justify-center px-4">
          <div className={`${cardBase} w-full max-w-md`} style={cardStyle}>
            <h3 className="text-blue-400 font-bold mb-5 text-lg">
              ✏️ Editar Transação
              <span className={`ml-2 text-sm font-normal ${editingTx.type === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
                ({editingTx.type})
              </span>
            </h3>
            {([
              { label: 'Descrição',  comp: <input type="text"   value={editDesc}  onChange={e => setEditDesc(e.target.value)}  maxLength={60} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              { label: 'Valor (R$)', comp: <input type="number" value={editValor} onChange={e => setEditValor(e.target.value)} min="0.01" step="0.01" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              { label: 'Categoria',  comp: <select value={editCat} onChange={e => setEditCat(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{...inputStyle, cursor:'pointer'}}>{CATS[editingTx.type as 'receita'|'despesa'].map(c=><option key={c} value={c}>{c}</option>)}</select> },
              { label: 'Data',       comp: <input type="date"   value={editData}  onChange={e => setEditData(e.target.value)}  className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              { label: 'Observação', comp: <input type="text"   value={editObs}   onChange={e => setEditObs(e.target.value)}   maxLength={80} placeholder="Opcional..." className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
            ] as { label: string; comp: React.ReactNode }[]).map(({ label, comp }) => (
              <div key={label} className="mb-3">
                <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">{label}</label>
                {comp}
              </div>
            ))}
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setEditingTx(null)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-600 hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={editSaving} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 hover:bg-blue-600 text-white transition-colors">
                {editSaving ? 'Salvando...' : '✔ Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL APORTE ── */}
      {modalGoalId && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center px-4">
          <div className={`${cardBase} w-full max-w-sm`} style={cardStyle}>
            <h3 className="text-blue-400 font-bold mb-4">💰 Registrar Aporte</h3>
            <div className="mb-4">
              <label className="text-xs text-slate-400 uppercase tracking-wide block mb-2">Valor (R$)</label>
              <input type="number" min="0.01" step="0.01" value={aporteValor}
                onChange={e => setAporteValor(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}
                placeholder="0,00"/>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setModalGoalId(null); setAporteValor('') }} className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-600 hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={confirmarAporte} className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-700 hover:bg-green-600 text-white transition-colors">✔ Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FORM CARTÃO ── */}
      {cardFormOpen && (
        <div className="fixed inset-0 bg-black/75 z-40 flex items-center justify-center px-4 overflow-y-auto py-6">
          <div className={`${cardBase} w-full max-w-md`} style={cardStyle}>
            <h3 className="text-blue-400 font-bold mb-5 text-lg">
              {editingCard ? '✏️ Editar Cartão' : '💳 Novo Cartão'}
            </h3>
            {([
              { label: 'Nome do Cartão',      comp: <input type="text"   value={cardForm.name}       maxLength={40} onChange={e=>setCardForm(f=>({...f,name:e.target.value}))}       placeholder="Ex: Nubank, Inter Visa..." className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              { label: 'Últimos 4 dígitos',   comp: <input type="text"   value={cardForm.lastDigits} maxLength={4}  onChange={e=>setCardForm(f=>({...f,lastDigits:e.target.value.replace(/\D/g,'').slice(0,4)}))} placeholder="1234" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              { label: 'Limite (R$)',          comp: <input type="number" value={cardForm.limit}      min="1" step="0.01" onChange={e=>setCardForm(f=>({...f,limit:e.target.value}))} placeholder="0,00" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              { label: 'Dia de Fechamento',    comp: <input type="number" value={cardForm.closingDay} min="1" max="31"    onChange={e=>setCardForm(f=>({...f,closingDay:e.target.value}))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              { label: 'Dia de Vencimento',    comp: <input type="number" value={cardForm.dueDay}     min="1" max="31"    onChange={e=>setCardForm(f=>({...f,dueDay:e.target.value}))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
            ] as { label: string; comp: React.ReactNode }[]).map(({ label, comp }) => (
              <div key={label} className="mb-3">
                <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">{label}</label>
                {comp}
              </div>
            ))}
            <div className="mb-3">
              <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {CARD_COLORS.map(c => (
                  <button key={c} onClick={() => setCardForm(f => ({...f, color: c}))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${cardForm.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ background: c }}/>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Ícone</label>
              <div className="flex gap-2 flex-wrap">
                {CARD_ICONS.map(ic => (
                  <button key={ic} onClick={() => setCardForm(f => ({...f, icon: ic}))}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all
                      ${cardForm.icon === ic ? 'border-blue-400 bg-blue-900/60' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setCardFormOpen(false); setEditingCard(null) }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-600 hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={saveCard} disabled={savingCard} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 hover:bg-blue-600 text-white transition-colors">
                {savingCard ? 'Salvando...' : '✔ Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL LANÇAMENTO NO CARTÃO ── */}
      {cardTxOpen && selectedCard && (
        <div className="fixed inset-0 bg-black/75 z-40 flex items-center justify-center px-4">
          <div className={`${cardBase} w-full max-w-md`} style={cardStyle}>
            <h3 className="text-blue-400 font-bold mb-1 text-lg">💳 Lançar no Cartão</h3>
            <p className="text-xs text-slate-400 mb-5">
              {selectedCard.icon} {selectedCard.name}
              {selectedCard.lastDigits ? ` •••• ${selectedCard.lastDigits}` : ''}
              {' '}· Fecha dia {selectedCard.closingDay}
            </p>
            {([
              { label: 'Descrição',      comp: <input type="text"   value={cardTxForm.description} maxLength={60} onChange={e=>setCardTxForm(f=>({...f,description:e.target.value}))} placeholder="Ex: Supermercado, Netflix..." className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              { label: 'Valor (R$)',     comp: <input type="number" value={cardTxForm.amount}      min="0.01" step="0.01" onChange={e=>setCardTxForm(f=>({...f,amount:e.target.value}))} placeholder="0,00" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              { label: 'Categoria',      comp: <select value={cardTxForm.category} onChange={e=>setCardTxForm(f=>({...f,category:e.target.value}))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{...inputStyle,cursor:'pointer'}}>{CATS.despesa.map(c=><option key={c} value={c}>{c}</option>)}</select> },
              { label: 'Data da Compra', comp: <input type="date"   value={cardTxForm.date}        onChange={e=>setCardTxForm(f=>({...f,date:e.target.value}))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              { label: 'Observação',     comp: <input type="text"   value={cardTxForm.note}        maxLength={80} onChange={e=>setCardTxForm(f=>({...f,note:e.target.value}))} placeholder="Opcional..." className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
            ] as { label: string; comp: React.ReactNode }[]).map(({ label, comp }) => (
              <div key={label} className="mb-3">
                <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">{label}</label>
                {comp}
              </div>
            ))}
            {cardTxForm.date && (
              <div className="mb-4 p-3 rounded-xl bg-blue-950/40 border border-blue-900/50">
                <span className="text-xs text-blue-400">
                  📅 Cairá na fatura de:{' '}
                  <strong>{previewInvoiceMonth(cardTxForm.date, selectedCard.closingDay)}</strong>
                </span>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setCardTxOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-600 hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={addCardTx} disabled={savingCardTx} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 hover:bg-blue-600 text-white transition-colors">
                {savingCardTx ? 'Lançando...' : '✔ Lançar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-white/10"
        style={{ background: 'linear-gradient(135deg,#0d1f3c,#0a0f1e)', boxShadow: '0 2px 24px #00000060' }}>
        <div className="text-xl font-black text-blue-400">💰 PlannerPro</div>

        <nav className="hidden md:flex gap-1">
          {navItems.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all
                ${page === n.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
              <span>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 text-white font-bold transition-colors">‹</button>
            <span className="text-blue-300 font-bold text-sm min-w-[120px] text-center">{MONTHS[currentMonth]} {currentYear}</span>
            <button onClick={() => changeMonth(1)}  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 text-white font-bold transition-colors">›</button>
          </div>
          <span className="hidden sm:block text-sm text-slate-400">👤 {user?.name?.split(' ')[0]}</span>
          <button onClick={logout} className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg border border-slate-700 hover:border-red-800">Sair</button>
          <button onClick={() => setMobileMenu(v => !v)} className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
            <span className={`block w-5 h-0.5 bg-slate-300 transition-transform ${mobileMenu ? 'rotate-45 translate-y-2' : ''}`}/>
            <span className={`block w-5 h-0.5 bg-slate-300 transition-opacity ${mobileMenu ? 'opacity-0' : ''}`}/>
            <span className={`block w-5 h-0.5 bg-slate-300 transition-transform ${mobileMenu ? '-rotate-45 -translate-y-2' : ''}`}/>
          </button>
        </div>
      </header>

      {/* ── MENU MOBILE DROPDOWN ── */}
      {mobileMenu && (
        <div className="md:hidden sticky top-[57px] z-20 border-b border-white/10 px-4 py-3 flex flex-col gap-1" style={{ background: '#0d1f3c' }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setMobileMenu(false) }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                ${page === n.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
              <span className="text-lg">{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── BOTTOM NAV MOBILE ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/10" style={{ background: '#0d1f3c' }}>
        {navItems.slice(0, 5).map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-1 text-[10px] font-semibold transition-colors
              ${page === n.id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <span className="text-lg">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-[1200px] mx-auto px-5 py-6 pb-24 md:pb-6 flex flex-col gap-6">

        {/* ══════════ DASHBOARD ══════════ */}
        {page === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '📥 Receitas',     value: fmt(totR),  sub: `${recs.length} lançamento(s)`,  color: 'text-green-400' },
                { label: '📤 Despesas',     value: fmt(totD),  sub: `${desps.length} lançamento(s)`, color: 'text-red-400' },
                { label: '💳 Saldo',        value: fmt(saldo), sub: saldo >= 0 ? '👍 Positivo' : '⚠️ Negativo', color: saldo >= 0 ? 'text-blue-400' : 'text-red-400' },
                { label: '📊 Comprometido', value: `${pct.toFixed(1)}%`, sub: 'da renda', color: pct > 90 ? 'text-red-400' : pct > 70 ? 'text-yellow-400' : 'text-green-400' },
              ].map((c, i) => (
                <div key={i} className={`${cardBase} hover:-translate-y-1 transition-transform`} style={cardStyle}>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">{c.label}</div>
                  <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{c.sub}</div>
                </div>
              ))}
            </div>

            <div className={cardBase} style={cardStyle}>
              <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-3">⚡ Comprometimento da Renda</div>
              <div className="flex justify-between text-xs text-slate-400 mb-2"><span>Despesas vs Receitas</span><span>{pct.toFixed(1)}%</span></div>
              <div className="bg-slate-900 rounded-full h-2.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: pct > 90 ? 'linear-gradient(90deg,#ef4444,#f87171)' : pct > 70 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#22c55e,#4ade80)' }}/>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {pct > 90 ? '🔴 Atenção: renda quase totalmente comprometida!' : pct > 70 ? '🟡 Cuidado: mais de 70% da renda em despesas.' : '🟢 Ótimo! Você está dentro de uma margem saudável.'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className={cardBase} style={cardStyle}>
                <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">🍩 Despesas por Categoria</div>
                {catEntries.length === 0
                  ? <div className="text-slate-500 text-sm text-center py-6">Sem despesas este mês.</div>
                  : catEntries.map(([c, v]) => (
                    <div key={c} className="mb-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{c}</span>
                        <div className="flex items-center gap-2">
                          {budgets.find(b => b.category === c) && (() => {
                            const b   = budgets.find(b => b.category === c)!
                            const over = v > b.limit
                            return (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${over ? 'bg-red-900/60 text-red-400' : 'bg-green-900/60 text-green-400'}`}>
                                {over ? '⚠️' : '✅'} {fmt(b.limit)}
                              </span>
                            )
                          })()}
                          <span>{fmt(v)}</span>
                        </div>
                      </div>
                      <div className="bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(v / catEntries[0][1] * 100).toFixed(1)}%`, background: COLORS[c] || '#64748b' }}/>
                      </div>
                    </div>
                  ))
                }
              </div>

              <div className={cardBase} style={{ ...cardStyle, maxHeight: 380, overflowY: 'auto' }}>
                <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4 sticky top-0 pb-1" style={cardStyle}>🕐 Últimas Transações</div>
                {loadingData
                  ? <div className="text-slate-500 text-sm text-center py-6 animate-pulse">Carregando...</div>
                  : transactions.length === 0
                    ? <div className="text-slate-500 text-sm text-center py-6">Sem transações este mês.</div>
                    : [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map(t => (
                      <div key={t.id} className={`flex justify-between items-center bg-slate-900/50 rounded-xl px-3 py-2.5 mb-2 border-l-4 ${t.type === 'receita' ? 'border-green-500' : 'border-red-500'}`}>
                        <div>
                          <div className="text-sm font-semibold">{t.description}</div>
                          <div className="text-xs text-slate-500">{t.category} · {fmtDate(t.date)}</div>
                        </div>
                        <span className={`font-black text-sm ${t.type === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
                          {t.type === 'receita' ? '+' : '-'} {fmt(t.amount)}
                        </span>
                      </div>
                    ))
                }
              </div>
            </div>

            {/* Resumo de cartões no Dashboard */}
            {cards.length > 0 && (
              <div className={cardBase} style={cardStyle}>
                <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">🃏 Cartões de Crédito</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cards.map(card => {
                    const inv  = card.invoices[0]
                    const used = inv?.total || 0
                    const p    = card.limit > 0 ? Math.min((used / card.limit) * 100, 100) : 0
                    return (
                      <div key={card.id} onClick={() => { setPage('cartoes'); selectCard(card) }}
                        className="bg-slate-900/60 rounded-xl p-4 border border-white/5 cursor-pointer hover:border-white/20 transition-all hover:-translate-y-0.5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                            style={{ background: card.color + '30', border: `2px solid ${card.color}` }}>
                            {card.icon}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{card.name}</div>
                            <div className="text-xs text-slate-500">{card.lastDigits ? `•••• ${card.lastDigits}` : 'Sem número'}</div>
                          </div>
                        </div>
                        <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden mb-1">
                          <div className="h-full rounded-full" style={{ width: `${p.toFixed(1)}%`, background: p > 90 ? '#ef4444' : p > 70 ? '#f59e0b' : card.color }}/>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-slate-400">{fmt(used)} usado</span>
                          <span style={{ color: card.color }} className="font-bold">{p.toFixed(0)}%</span>
                        </div>
                        {inv && !inv.paid && (
                          <div className="mt-2 text-[10px] text-red-400 font-bold">⚠️ Fatura aberta: {fmt(inv.total)}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className={cardBase} style={cardStyle}>
              <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">📈 Histórico Anual (12 meses)</div>
              <AnnualChart annualData={annualData}/>
            </div>
          </>
        )}

        {/* ══════════ LANÇAMENTOS ══════════ */}
        {page === 'transactions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardBase} style={cardStyle}>
              <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">➕ Nova Transação</div>
              <div className="flex gap-2 mb-4">
                <button onClick={() => { setTab('receita'); setFCat(CATS.receita[0]) }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${tab === 'receita' ? 'bg-green-900 text-green-300 border-green-500' : 'bg-green-950/30 text-green-600 border-green-900'}`}>
                  📥 Receita
                </button>
                <button onClick={() => { setTab('despesa'); setFCat(CATS.despesa[0]) }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${tab === 'despesa' ? 'bg-red-900 text-red-300 border-red-500' : 'bg-red-950/30 text-red-700 border-red-900'}`}>
                  📤 Despesa
                </button>
              </div>
              {([
                { label: 'Descrição',  comp: <input type="text"   value={fDesc}  onChange={e=>setFDesc(e.target.value)}  maxLength={60} placeholder="Ex: Salário, Supermercado..." className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
                { label: 'Valor (R$)', comp: <input type="number" value={fValor} onChange={e=>setFValor(e.target.value)} min="0.01" step="0.01" placeholder="0,00" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
                { label: 'Categoria',  comp: <select value={fCat} onChange={e=>setFCat(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{...inputStyle,cursor:'pointer'}}>{CATS[tab].map(c=><option key={c} value={c}>{c}</option>)}</select> },
                { label: 'Data',       comp: <input type="date"   value={fData}  onChange={e=>setFData(e.target.value)}  className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
                { label: 'Observação', comp: <input type="text"   value={fObs}   onChange={e=>setFObs(e.target.value)}   maxLength={80} placeholder="Opcional..." className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
              ] as { label: string; comp: React.ReactNode }[]).map(({ label, comp }) => (
                <div key={label} className="mb-3">
                  <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">{label}</label>
                  {comp}
                </div>
              ))}
              <button onClick={addTransaction} disabled={saving}
                className={`w-full py-3 rounded-xl font-bold text-white mt-2 transition-all
                  ${tab === 'receita' ? (saving ? 'bg-green-800' : 'bg-green-700 hover:bg-green-600') : (saving ? 'bg-red-800' : 'bg-red-700 hover:bg-red-600')}`}>
                {saving ? 'Salvando...' : `✔ Adicionar ${tab === 'receita' ? 'Receita' : 'Despesa'}`}
              </button>
            </div>

            <div className={cardBase} style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-blue-400 uppercase font-bold tracking-wider">📋 Transações do Mês</div>
                <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                  className="rounded-lg px-3 py-1.5 text-xs outline-none" style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="all">Todos</option>
                  <option value="receita">Receitas</option>
                  <option value="despesa">Despesas</option>
                </select>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: 420 }}>
                {loadingData
                  ? <div className="text-slate-500 text-sm text-center py-8 animate-pulse">Carregando...</div>
                  : filteredList.length === 0
                    ? <div className="text-slate-500 text-sm text-center py-8">Nenhuma transação encontrada.</div>
                    : [...filteredList].sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                      <div key={t.id} className={`flex justify-between items-center bg-slate-900/50 rounded-xl px-3 py-2.5 mb-2 border-l-4 hover:bg-slate-900 transition-colors group ${t.type === 'receita' ? 'border-green-500' : 'border-red-500'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{t.description}</div>
                          <div className="text-xs text-slate-500">
                            {t.category} · {fmtDate(t.date)}
                            {t.source === 'invoice_import' && <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-900/60 text-blue-400 border border-blue-800">📄 fatura</span>}
                            {t.cardId && <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-900/60 text-purple-400 border border-purple-800">💳 cartão</span>}
                            {t.note ? ` · ${t.note}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <span className={`font-black text-sm ${t.type === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
                            {t.type === 'receita' ? '+' : '-'} {fmt(t.amount)}
                          </span>
                          <button onClick={() => openEdit(t)} className="text-slate-600 hover:text-blue-400 transition-colors text-sm opacity-0 group-hover:opacity-100">✏️</button>
                          <button onClick={() => deleteTransaction(t.id)} className="text-slate-600 hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100">🗑</button>
                        </div>
                      </div>
                    ))
                }
              </div>
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <span className="text-xs text-slate-500">{pagination.total} transações · pág. {pagination.page}/{pagination.totalPages}</span>
                  <div className="flex gap-2">
                    <button disabled={currentPage <= 1} onClick={() => loadTransactions(currentPage - 1)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-600 disabled:opacity-40 hover:bg-white/5 transition-colors">‹ Anterior</button>
                    <button disabled={currentPage >= pagination.totalPages} onClick={() => loadTransactions(currentPage + 1)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-600 disabled:opacity-40 hover:bg-white/5 transition-colors">Próxima ›</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════ ORÇAMENTO ══════════ */}
        {page === 'orcamento' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={cardBase} style={cardStyle}>
                <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">🎚️ Definir Limite por Categoria</div>
                <div className="text-xs text-slate-400 mb-4">Mês: <span className="text-blue-300 font-bold">{MONTHS[currentMonth]} {currentYear}</span></div>
                <div className="mb-3">
                  <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Categoria</label>
                  <select value={budgetCat} onChange={e => setBudgetCat(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ ...inputStyle, cursor: 'pointer' }}>
                    {DESPESA_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Limite (R$)</label>
                  <input type="number" min="1" step="0.01" value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)}
                    placeholder="0,00" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/>
                </div>
                <button onClick={saveBudget} className="w-full py-3 rounded-xl font-bold text-white bg-blue-700 hover:bg-blue-600 transition-colors">✔ Salvar Orçamento</button>
              </div>

              <div className={cardBase} style={cardStyle}>
                <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">📊 Resumo do Mês</div>
                {budgets.length === 0
                  ? <div className="text-slate-500 text-sm text-center py-8">Nenhum orçamento definido para este mês.</div>
                  : (() => {
                    const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
                    const totalSpent = budgets.reduce((s, b) => s + (budgetSpending[b.category] || 0), 0)
                    const over       = budgets.filter(b => (budgetSpending[b.category] || 0) > b.limit).length
                    return (
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { v: fmt(totalLimit), l: 'Total Orçado',         c: 'text-blue-400' },
                          { v: fmt(totalSpent), l: 'Gasto no Mês',         c: 'text-red-400' },
                          { v: over,            l: 'Categ. Estouradas',    c: 'text-yellow-400' },
                        ].map(({ v, l, c }) => (
                          <div key={l} className="text-center bg-slate-900/60 rounded-xl p-4">
                            <div className={`text-xl font-black ${c}`}>{v}</div>
                            <div className="text-xs text-slate-500 mt-1">{l}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })()
                }
              </div>
            </div>

            <div className={cardBase} style={cardStyle}>
              <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">📋 Orçamentos Definidos</div>
              {budgets.length === 0
                ? <div className="text-slate-500 text-sm text-center py-8">Nenhum orçamento cadastrado.</div>
                : (
                  <div className="flex flex-col gap-3">
                    {budgets.map(b => {
                      const spent    = budgetSpending[b.category] || 0
                      const p        = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : 0
                      const over     = spent > b.limit
                      const barColor = over ? '#ef4444' : p > 80 ? '#f59e0b' : '#22c55e'
                      return (
                        <div key={b.id} className="bg-slate-900/60 rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-sm">{b.category}</span>
                              {over
                                ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/60 text-red-400 font-bold">⚠️ Estourado</span>
                                : p > 80
                                  ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/60 text-yellow-400 font-bold">⚡ Atenção</span>
                                  : <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/60 text-green-400 font-bold">✅ OK</span>
                              }
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400">{fmt(spent)} / {fmt(b.limit)}</span>
                              <button onClick={() => deleteBudget(b.id)} className="text-slate-600 hover:text-red-400 transition-colors text-sm">🗑</button>
                            </div>
                          </div>
                          <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.toFixed(1)}%`, background: barColor }}/>
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span style={{ color: barColor }} className="font-bold">{p.toFixed(1)}%</span>
                            <span className="text-slate-500">{over ? `Excedeu ${fmt(spent - b.limit)}` : `Restam ${fmt(b.limit - spent)}`}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>
          </>
        )}

        {/* ══════════ CARTÕES ══════════ */}
        {page === 'cartoes' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1 flex flex-col gap-4">
              <div className={`${cardBase} flex items-center justify-between`} style={cardStyle}>
                <span className="text-xs text-blue-400 uppercase font-bold tracking-wider">🃏 Meus Cartões</span>
                <button onClick={() => { setEditingCard(null); setCardForm({ name:'', lastDigits:'', limit:'', closingDay:'10', dueDay:'20', color:'#3b82f6', icon:'💳' }); setCardFormOpen(true) }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold transition-colors">
                  + Novo
                </button>
              </div>

              {cards.length === 0
                ? (
                  <div className={`${cardBase} text-center py-10 text-slate-500 text-sm`} style={cardStyle}>
                    Nenhum cartão cadastrado.<br/>
                    <button onClick={() => setCardFormOpen(true)} className="mt-3 text-blue-400 hover:underline text-xs">Adicionar cartão</button>
                  </div>
                )
                : cards.map(card => {
                  const inv        = card.invoices[0]
                  const used       = inv?.total || 0
                  const p          = card.limit > 0 ? Math.min((used / card.limit) * 100, 100) : 0
                  const isSelected = selectedCard?.id === card.id
                  return (
                    <div key={card.id} onClick={() => selectCard(card)}
                      className={`${cardBase} cursor-pointer transition-all hover:-translate-y-0.5
                        ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-white/10 hover:border-white/20'}`}
                      style={cardStyle}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
                            style={{ background: card.color + '30', border: `2px solid ${card.color}` }}>
                            {card.icon}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{card.name}</div>
                            <div className="text-xs text-slate-500">{card.lastDigits ? `•••• ${card.lastDigits}` : 'Sem número'}</div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={e => { e.stopPropagation(); openEditCard(card) }} className="text-slate-600 hover:text-blue-400 transition-colors text-sm p-1">✏️</button>
                          <button onClick={e => { e.stopPropagation(); deleteCard(card.id) }} className="text-slate-600 hover:text-red-400 transition-colors text-sm p-1">🗑</button>
                        </div>
                      </div>
                      <div className="mb-1 flex justify-between text-xs text-slate-400">
                        <span>Utilizado</span><span>{fmt(used)} / {fmt(card.limit)}</span>
                      </div>
                      <div className="bg-slate-900 rounded-full h-2 overflow-hidden mb-2">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${p.toFixed(1)}%`, background: p > 90 ? '#ef4444' : p > 70 ? '#f59e0b' : card.color }}/>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: card.color }} className="font-bold">{p.toFixed(1)}% usado</span>
                        <span className="text-slate-500">Disponível: {fmt(card.limit - used)}</span>
                      </div>
                      <div className="flex gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
                        <span>📅 Fecha dia {card.closingDay}</span>
                        <span>💰 Vence dia {card.dueDay}</span>
                      </div>
                      {inv && (
                        <div className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-bold text-center
                          ${inv.paid ? 'bg-green-900/40 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                          {inv.paid ? '✅ Fatura paga' : `⚠️ Fatura aberta: ${fmt(inv.total)}`}
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>

            <div className="md:col-span-2 flex flex-col gap-4">
              {!selectedCard
                ? (
                  <div className={`${cardBase} flex flex-col items-center justify-center py-20 text-slate-500`} style={cardStyle}>
                    <div className="text-5xl mb-4">🃏</div>
                    <div className="font-semibold mb-1">Selecione um cartão</div>
                    <div className="text-xs">Clique em um cartão para ver as faturas</div>
                  </div>
                )
                : (
                  <>
                    <div className={cardBase} style={{ ...cardStyle, borderColor: selectedCard.color + '60' }}>
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                            style={{ background: selectedCard.color + '25', border: `2px solid ${selectedCard.color}` }}>
                            {selectedCard.icon}
                          </div>
                          <div>
                            <div className="text-lg font-black">{selectedCard.name}</div>
                            <div className="text-xs text-slate-400">
                              {selectedCard.lastDigits ? `•••• ${selectedCard.lastDigits}` : 'Cartão'}
                              {' '}· Limite: <span className="text-white font-bold">{fmt(selectedCard.limit)}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">Fecha dia {selectedCard.closingDay} · Vence dia {selectedCard.dueDay}</div>
                          </div>
                        </div>
                        <button onClick={() => setCardTxOpen(true)}
                          className="px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 flex items-center gap-2"
                          style={{ background: selectedCard.color }}>
                          + Lançar Despesa
                        </button>
                      </div>
                    </div>

                    <div className={cardBase} style={cardStyle}>
                      <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">📋 Faturas</div>
                      {loadingInvoices
                        ? <div className="text-slate-500 text-sm text-center py-8 animate-pulse">Carregando faturas...</div>
                        : cardInvoices.length === 0
                          ? <div className="text-slate-500 text-sm text-center py-8">Nenhuma fatura ainda. Lance uma despesa para começar.</div>
                          : cardInvoices.map(inv => {
                            const isOpen = openInvoice === inv.month
                            const [y, m] = inv.month.split('-')
                            const label  = `${MONTHS[parseInt(m) - 1]} ${y}`
                            const vencLabel = `Vence dia ${selectedCard.dueDay}/${m}/${y}`
                            return (
                              <div key={inv.month} className="mb-3 rounded-xl overflow-hidden border border-white/5">
                                <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                                  style={{ background: '#0d1a2d' }}
                                  onClick={() => setOpenInvoice(isOpen ? null : inv.month)}>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-sm">{label}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${inv.paid ? 'bg-green-900/60 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                                      {inv.paid ? '✅ Paga' : '🔴 Aberta'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 hidden sm:block">{vencLabel}</span>
                                    <span className="font-black text-sm text-red-400">{fmt(inv.total)}</span>
                                    {!inv.paid && (
                                      <button onClick={e => { e.stopPropagation(); payInvoice(selectedCard.id, inv.month) }}
                                        className="text-xs px-3 py-1 rounded-lg bg-green-800 hover:bg-green-700 text-green-200 font-bold transition-colors">
                                        Pagar
                                      </button>
                                    )}
                                    <span className="text-slate-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                                  </div>
                                </div>
                                {isOpen && (
                                  <div className="px-4 py-3" style={{ background: '#0a0f1e' }}>
                                    {(!inv.transactions || inv.transactions.length === 0)
                                      ? <div className="text-slate-500 text-sm text-center py-4">Nenhuma transação.</div>
                                      : inv.transactions.map(t => (
                                        <div key={t.id} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                                          <div>
                                            <div className="text-sm font-semibold">{t.description}</div>
                                            <div className="text-xs text-slate-500">{t.category} · {fmtDate(t.date)}</div>
                                          </div>
                                          <span className="text-red-400 font-bold text-sm">- {fmt(t.amount)}</span>
                                        </div>
                                      ))
                                    }
                                    <div className="flex justify-between items-center pt-3 mt-1 border-t border-white/10">
                                      <span className="text-xs text-slate-400 font-semibold uppercase">Total da Fatura</span>
                                      <span className="text-red-400 font-black">{fmt(inv.total)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })
                      }
                    </div>
                  </>
                )
              }
            </div>
          </div>
        )}

        {/* ══════════ METAS ══════════ */}
        {page === 'metas' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={cardBase} style={cardStyle}>
                <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">🎯 Nova Meta</div>
                {([
                  { label: 'Nome da Meta',    comp: <input type="text"   value={mNome}  onChange={e=>setMNome(e.target.value)}  maxLength={50} placeholder="Ex: Viagem, Reserva..." className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
                  { label: 'Valor Alvo (R$)', comp: <input type="number" value={mAlvo}  onChange={e=>setMAlvo(e.target.value)}  min="1" step="0.01" placeholder="0,00" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
                  { label: 'Data Limite',     comp: <input type="date"   value={mPrazo} onChange={e=>setMPrazo(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}/> },
                  { label: 'Ícone', comp:
                    <select value={mIcon} onChange={e=>setMIcon(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{...inputStyle,cursor:'pointer'}}>
                      {['✈️ Viagem','🏠 Casa / Imóvel','🚗 Carro','🏍️ Moto','📱 Eletrônico','🎓 Educação','💍 Casamento','🛡️ Reserva','💰 Investimento','🎯 Outro']
                        .map(o => <option key={o} value={o.split(' ')[0]}>{o}</option>)}
                    </select>,
                  },
                ] as { label: string; comp: React.ReactNode }[]).map(({ label, comp }) => (
                  <div key={label} className="mb-3">
                    <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">{label}</label>
                    {comp}
                  </div>
                ))}
                <button onClick={addMeta} className="w-full py-3 rounded-xl font-bold text-white bg-blue-700 hover:bg-blue-600 transition-colors mt-2">✔ Criar Meta</button>
              </div>

              <div className={cardBase} style={cardStyle}>
                <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">📊 Visão Geral</div>
                {goals.length === 0
                  ? <div className="text-slate-500 text-sm text-center py-8">Nenhuma meta criada.</div>
                  : (() => {
                    const total   = goals.reduce((s, g) => s + g.target,  0)
                    const captado = goals.reduce((s, g) => s + g.current, 0)
                    const concl   = goals.filter(g => g.current >= g.target).length
                    return (
                      <>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          {[
                            { v: goals.length, l: 'Metas',      c: 'text-blue-400' },
                            { v: concl,        l: 'Concluídas', c: 'text-green-400' },
                            { v: fmt(captado), l: 'Captado',    c: 'text-yellow-400' },
                          ].map(({ v, l, c }) => (
                            <div key={l} className="text-center">
                              <div className={`text-2xl font-black ${c}`}>{v}</div>
                              <div className="text-xs text-slate-500">{l}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-slate-400 mb-1">Total: {fmt(captado)} de {fmt(total)}</div>
                        <div className="bg-slate-900 rounded-full h-2.5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                            style={{ width: `${total > 0 ? (captado / total * 100).toFixed(1) : 0}%` }}/>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 text-right">{total > 0 ? (captado / total * 100).toFixed(1) : 0}%</div>
                      </>
                    )
                  })()
                }
              </div>
            </div>

            <div className={cardBase} style={cardStyle}>
              <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">🎯 Minhas Metas</div>
              {goals.length === 0
                ? <div className="text-slate-500 text-sm text-center py-8">Nenhuma meta criada ainda.</div>
                : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goals.map(g => {
                      const p      = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0
                      const done   = g.current >= g.target
                      const resta  = g.target - g.current
                      const dias   = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000) : null
                      const barClr = done ? '#22c55e' : p > 50 ? '#3b82f6' : '#f59e0b'
                      return (
                        <div key={g.id} className="bg-slate-900/60 rounded-2xl p-5 border border-white/5 relative">
                          <button onClick={() => deleteMeta(g.id)} className="absolute top-3 right-3 text-slate-600 hover:text-red-400 transition-colors text-sm">🗑</button>
                          <div className="text-3xl mb-2">{g.icon}</div>
                          <div className="font-bold mb-1">
                            {g.name}
                            {done && <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full ml-1">✓</span>}
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 mb-2">
                            <span>{fmt(g.current)}</span><span>Meta: {fmt(g.target)}</span>
                          </div>
                          <div className="bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.toFixed(1)}%`, background: barClr }}/>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mb-3">
                            <span className="text-blue-400 font-bold">{p.toFixed(1)}%</span>
                            <span>{done ? '🎉 Concluída!' : 'Faltam ' + fmt(resta)}</span>
                          </div>
                          {dias !== null && (
                            <div className={`text-xs mb-3 ${dias < 0 ? 'text-red-400' : dias < 30 ? 'text-yellow-400' : 'text-slate-500'}`}>
                              {dias < 0 ? '⚠️ Prazo vencido' : dias === 0 ? '📅 Vence hoje' : `📅 ${dias} dias restantes`}
                            </div>
                          )}
                          {!done && (
                            <button onClick={() => setModalGoalId(g.id)} className="w-full py-2 rounded-xl text-xs font-bold bg-blue-900/60 text-blue-300 hover:bg-blue-700 transition-colors">
                              💰 Registrar Aporte
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>
          </>
        )}

        {/* ══════════ IMPORTAR ══════════ */}
        {page === 'import' && (
          <>
            <div className={cardBase} style={cardStyle}>
              <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-4">📥 Importar Fatura / Extrato</div>
              <div className="mb-5 p-4 rounded-xl border border-blue-900/50 bg-blue-950/20">
                <label className="block text-xs text-blue-400 font-semibold uppercase tracking-wide mb-2">📅 Mês de referência da fatura</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input type="month" value={importInvoiceMonth} onChange={e => setImportInvoiceMonth(e.target.value)}
                    className="rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle}/>
                  <span className="text-xs text-slate-400 leading-relaxed">Todas as transações importadas serão agrupadas neste mês.</span>
                </div>
              </div>
              <div
                className="border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-950/20 transition-all"
                onClick={() => document.getElementById('file-input')?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500') }}
                onDragLeave={e => e.currentTarget.classList.remove('border-blue-500')}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}>
                <div className="text-4xl mb-3">📂</div>
                <div className="font-bold mb-1">Clique ou arraste o arquivo aqui</div>
                <div className="text-sm text-slate-400">Suporta .ofx, .qfx, .csv — processado localmente</div>
                <input id="file-input" type="file" accept=".ofx,.qfx,.csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}/>
              </div>
            </div>

            {importRows.length > 0 && (
              <div className={cardBase} style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-blue-400 uppercase font-bold tracking-wider">👁 Preview — {importRows.length} transações</div>
                  <div className="flex gap-2">
                    <button onClick={() => setImportChecked(importRows.map(() => true))} className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 hover:bg-white/5 transition-colors">✅ Todos</button>
                    <button onClick={() => setImportChecked(importRows.map(() => false))} className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 hover:bg-white/5 transition-colors">⬜ Nenhum</button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto mb-4">
                  {importRows.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-900/60 rounded-xl px-4 py-2.5">
                      <input type="checkbox" checked={importChecked[i] || false}
                        onChange={e => { const c = [...importChecked]; c[i] = e.target.checked; setImportChecked(c) }}
                        className="w-4 h-4 accent-blue-500 flex-shrink-0"/>
                      <span className="flex-1 text-sm truncate">{r.desc}</span>
                      <span className="text-xs text-slate-500 min-w-[70px] text-center">{fmtDate(r.data)}</span>
                      <span className={`font-bold text-sm min-w-[90px] text-right ${r.tipo === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
                        {r.tipo === 'receita' ? '+' : '-'} {fmt(r.valor)}
                      </span>
                      <select value={importCats[i] || 'Outros'}
                        onChange={e => { const c = [...importCats]; c[i] = e.target.value; setImportCats(c) }}
                        className="rounded-lg px-2 py-1 text-xs outline-none" style={{ ...inputStyle, cursor: 'pointer' }}>
                        {CATS[r.tipo as 'receita' | 'despesa'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  <button onClick={confirmImport} className="px-5 py-2.5 rounded-xl font-bold text-white bg-green-700 hover:bg-green-600 transition-colors">
                    ✔ Importar {importChecked.filter(Boolean).length} selecionados
                  </button>
                  <button onClick={() => { setImportRows([]); setImportChecked([]); setImportCats([]) }}
                    className="px-4 py-2.5 rounded-xl font-bold border border-slate-600 hover:bg-white/5 transition-colors">
                    ✖ Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ RELATÓRIO ══════════ */}
        {page === 'relatorio' && (
          <div className={cardBase} style={cardStyle}>
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs text-blue-400 uppercase font-bold tracking-wider">📄 Relatório — {MONTHS[currentMonth]} {currentYear}</div>
              <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white bg-blue-700 hover:bg-blue-600 transition-colors text-sm">⬇ Exportar PDF</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { l: '📥 Receitas',     v: fmt(totR),  c: 'text-green-400' },
                { l: '📤 Despesas',     v: fmt(totD),  c: 'text-red-400' },
                { l: '💳 Saldo',        v: fmt(saldo), c: saldo >= 0 ? 'text-blue-400' : 'text-red-400' },
                { l: '📊 Comprometido', v: `${totR > 0 ? (totD / totR * 100).toFixed(1) : 0}%`, c: 'text-yellow-400' },
              ].map(({ l, v, c }) => (
                <div key={l} className="bg-slate-900/60 rounded-xl p-4">
                  <div className="text-xs text-slate-400 mb-1">{l}</div>
                  <div className={`text-xl font-black ${c}`}>{v}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {[
                { title: '📥 Receitas', items: recs,  color: 'border-green-500', amtColor: 'text-green-400' },
                { title: '📤 Despesas', items: desps, color: 'border-red-500',   amtColor: 'text-red-400'   },
              ].map(({ title, items, color, amtColor }) => (
                <div key={title}>
                  <div className={`font-bold text-sm mb-3 ${amtColor}`}>{title}</div>
                  {items.length === 0
                    ? <div className="text-slate-500 text-sm text-center py-4">Nenhum lançamento.</div>
                    : [...items].sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                      <div key={t.id} className={`flex justify-between items-center bg-slate-900/50 rounded-xl px-3 py-2.5 mb-2 border-l-4 ${color}`}>
                        <div>
                          <div className="text-sm font-semibold">{t.description}</div>
                          <div className="text-xs text-slate-500">{t.category} · {fmtDate(t.date)}</div>
                        </div>
                        <span className={`font-black text-sm ${amtColor}`}>{fmt(t.amount)}</span>
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>
            <div>
              <div className="font-bold text-sm text-blue-400 mb-3">🍩 Despesas por Categoria</div>
              {catEntries.length === 0
                ? <div className="text-slate-500 text-sm text-center py-4">Sem despesas.</div>
                : catEntries.map(([c, v]) => (
                  <div key={c} className="mb-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{c}</span>
                      <span>{fmt(v)} ({totD > 0 ? (v / totD * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div className="bg-slate-900 rounded-full h-2.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(v / catEntries[0][1] * 100).toFixed(1)}%`, background: COLORS[c] || '#64748b' }}/>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
