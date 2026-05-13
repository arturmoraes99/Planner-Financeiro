import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/api/client'
import { useToast } from './useToast'
import { todayStr, currentMonthStr } from '@/lib/utils'
import { DEFAULT_CARD_FORM, CATS } from '@/constants'
import type {
  Transaction, Goal, Budget, MonthlySummary,
  Pagination, CreditCard, CardInvoice, CardFormData,
} from '@/types'

export function useDashboard() {
  const { toast, showToast } = useToast()

  // ── Navegação ─────────────────────────────────────────────────────────────
  const [page,         setPage]         = useState('dashboard')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear,  setCurrentYear]  = useState(new Date().getFullYear())
  const [mobileMenu,   setMobileMenu]   = useState(false)

  // ── Dados ─────────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals,        setGoals]        = useState<Goal[]>([])
  const [budgets,      setBudgets]      = useState<Budget[]>([])
  const [annualData,   setAnnualData]   = useState<MonthlySummary[]>([])
  const [pagination,   setPagination]   = useState<Pagination>({
    total: 0, page: 1, totalPages: 1, limit: 20,
  })
  const [loadingData,  setLoadingData]  = useState(false)
  const [currentPage,  setCurrentPage]  = useState(1)

  // ── Cards ─────────────────────────────────────────────────────────────────
  const [cards,           setCards]           = useState<CreditCard[]>([])
  const [selectedCard,    setSelectedCard]    = useState<CreditCard | null>(null)
  const [cardInvoices,    setCardInvoices]    = useState<(CardInvoice & { transactions: Transaction[] })[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [openInvoice,     setOpenInvoice]     = useState<string | null>(null)
  const [cardFormOpen,    setCardFormOpen]    = useState(false)
  const [editingCard,     setEditingCard]     = useState<CreditCard | null>(null)
  const [savingCard,      setSavingCard]      = useState(false)
  const [cardForm,        setCardForm]        = useState<CardFormData>(DEFAULT_CARD_FORM)
  const [cardTxOpen,      setCardTxOpen]      = useState(false)
  const [savingCardTx,    setSavingCardTx]    = useState(false)
  const [cardTxForm,      setCardTxForm]      = useState({
    description: '', amount: '', category: CATS.despesa[0], date: todayStr(), note: '',
  })

  // ── Metas ─────────────────────────────────────────────────────────────────
  const [modalGoalId, setModalGoalId] = useState<string | null>(null)
  const [aporteValor, setAporteValor] = useState('')

  // ── Helpers ───────────────────────────────────────────────────────────────
  const yearMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  const changeMonth = useCallback((dir: number) => {
    setCurrentMonth(m => {
      let nm = m + dir
      if (nm < 0)  { setCurrentYear(y => y - 1); return 11 }
      if (nm > 11) { setCurrentYear(y => y + 1); return 0  }
      return nm
    })
  }, [])

  // ── Loaders ───────────────────────────────────────────────────────────────
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

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTransactions(1)
    loadAnnual()
    loadBudgets()
    loadCards()
  }, [loadTransactions, loadAnnual, loadBudgets, loadCards])

  useEffect(() => { if (page === 'metas')     loadGoals()   }, [page, loadGoals])
  useEffect(() => { if (page === 'orcamento') loadBudgets() }, [page, loadBudgets])
  useEffect(() => { if (page === 'cartoes')   loadCards()   }, [page, loadCards])

  // ── CRUD Transações ───────────────────────────────────────────────────────
  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await api.delete(`/transactions/${id}`)
      showToast('🗑 Removido', 'info')
      await loadTransactions(currentPage)
      await loadAnnual()
    } catch {
      showToast('Erro ao remover.', 'err')
    }
  }, [currentPage, loadTransactions, loadAnnual, showToast])

  const saveTransaction = useCallback(async (payload: Omit<Transaction, 'id'>) => {
    await api.post('/transactions', payload)
    await loadTransactions(1)
    await loadAnnual()
  }, [loadTransactions, loadAnnual])

  const updateTransaction = useCallback(async (id: string, payload: Partial<Transaction>) => {
    await api.put(`/transactions/${id}`, payload)
    await loadTransactions(currentPage)
    await loadAnnual()
  }, [currentPage, loadTransactions, loadAnnual])

  // ── CRUD Metas ────────────────────────────────────────────────────────────
  const deleteMeta = useCallback(async (id: string) => {
    try {
      await api.delete(`/goals/${id}`)
      showToast('🗑 Meta removida', 'info')
      await loadGoals()
    } catch {
      showToast('Erro ao remover meta.', 'err')
    }
  }, [loadGoals, showToast])

  const confirmarAporte = useCallback(async () => {
    if (!aporteValor || parseFloat(aporteValor) <= 0)
      return showToast('Informe o valor!', 'err')
    try {
      await api.patch(`/goals/${modalGoalId}/contribution`, { amount: parseFloat(aporteValor) })
      setModalGoalId(null)
      setAporteValor('')
      showToast('💰 Aporte registrado!', 'ok')
      await loadGoals()
    } catch {
      showToast('Erro ao registrar aporte.', 'err')
    }
  }, [aporteValor, modalGoalId, loadGoals, showToast])

  // ── CRUD Orçamento ────────────────────────────────────────────────────────
  const deleteBudget = useCallback(async (id: string) => {
    try {
      await api.delete(`/budgets/${id}`)
      showToast('🗑 Orçamento removido', 'info')
      await loadBudgets()
    } catch {
      showToast('Erro ao remover.', 'err')
    }
  }, [loadBudgets, showToast])

  // ── CRUD Cartões ──────────────────────────────────────────────────────────
  const saveCard = useCallback(async () => {
    if (!cardForm.name.trim())
      return showToast('Informe o nome!', 'err')
    if (!cardForm.limit || parseFloat(cardForm.limit) <= 0)
      return showToast('Informe o limite!', 'err')

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
      setCardForm(DEFAULT_CARD_FORM)
      await loadCards()
    } catch {
      showToast('Erro ao salvar cartão.', 'err')
    } finally {
      setSavingCard(false)
    }
  }, [cardForm, editingCard, loadCards, showToast])

  const deleteCard = useCallback(async (id: string) => {
    try {
      await api.delete(`/cards/${id}`)
      if (selectedCard?.id === id) {
        setSelectedCard(null)
        setCardInvoices([])
      }
      showToast('🗑 Cartão removido.', 'info')
      await loadCards()
    } catch {
      showToast('Erro ao remover cartão.', 'err')
    }
  }, [selectedCard, loadCards, showToast])

  const openEditCard = useCallback((card: CreditCard) => {
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
  }, [])

  const selectCard = useCallback((card: CreditCard) => {
    setSelectedCard(card)
    setOpenInvoice(null)
    loadInvoices(card.id)
  }, [loadInvoices])

  const addCardTx = useCallback(async () => {
    if (!selectedCard)
      return showToast('Selecione um cartão!', 'err')
    if (!cardTxForm.description.trim())
      return showToast('Informe a descrição!', 'err')
    if (!cardTxForm.amount || parseFloat(cardTxForm.amount) <= 0)
      return showToast('Informe o valor!', 'err')

    setSavingCardTx(true)
    try {
      await api.post(`/cards/${selectedCard.id}/transactions`, cardTxForm)
      setCardTxOpen(false)
      setCardTxForm({ description: '', amount: '', category: CATS.despesa[0], date: todayStr(), note: '' })
      showToast('💳 Lançamento adicionado!', 'ok')
      await loadInvoices(selectedCard.id)
      await loadCards()
    } catch {
      showToast('Erro ao lançar no cartão.', 'err')
    } finally {
      setSavingCardTx(false)
    }
  }, [selectedCard, cardTxForm, loadInvoices, loadCards, showToast])

  const payInvoice = useCallback(async (cardId: string, month: string) => {
    try {
      await api.patch(`/cards/${cardId}/invoices/${month}/pay`, {})
      showToast('✅ Fatura marcada como paga!', 'ok')
      await loadInvoices(cardId)
    } catch {
      showToast('Erro ao pagar fatura.', 'err')
    }
  }, [loadInvoices, showToast])

  // ── Cálculos memoizados ───────────────────────────────────────────────────
  const recs  = useMemo(() => transactions.filter(t => t.type === 'receita'), [transactions])
  const desps = useMemo(() => transactions.filter(t => t.type === 'despesa'), [transactions])
  const totR  = useMemo(() => recs.reduce((s, t)  => s + t.amount, 0), [recs])
  const totD  = useMemo(() => desps.reduce((s, t) => s + t.amount, 0), [desps])
  const saldo = totR - totD
  const pct   = totR > 0 ? Math.min((totD / totR) * 100, 100) : 0

  const catEntries = useMemo(() => {
    const map: Record<string, number> = {}
    desps.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [desps])

  const budgetSpending = useMemo(() => {
    const map: Record<string, number> = {}
    desps.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return map
  }, [desps])

  return {
    // Navegação
    page, setPage, currentMonth, currentYear, yearMonthStr, changeMonth,
    mobileMenu, setMobileMenu,

    // Dados
    transactions, goals, budgets, annualData,
    pagination, loadingData, currentPage,
    cards, selectedCard, cardInvoices, loadingInvoices,
    openInvoice, setOpenInvoice,

    // Summary
    recs, desps, totR, totD, saldo, pct, catEntries, budgetSpending,

    // Loaders
    loadTransactions, loadGoals, loadBudgets, loadAnnual, loadCards, loadInvoices,

    // CRUD
    deleteTransaction, saveTransaction, updateTransaction,
    deleteMeta, confirmarAporte,
    aporteValor, setAporteValor, modalGoalId, setModalGoalId,
    deleteBudget,
    saveCard, deleteCard, openEditCard, selectCard, addCardTx, payInvoice,

    // Card form
    cardForm, setCardForm, cardFormOpen, setCardFormOpen,
    editingCard, setEditingCard, savingCard,
    cardTxForm, setCardTxForm, cardTxOpen, setCardTxOpen, savingCardTx,

    // Toast
    toast, showToast,
  }
}
