import { useEffect, useState } from 'react'
import { Card, CardTitle, Button, Input, Select, Modal, EmptyState, Spinner, Badge } from '@/components/ui'
import { useCards }        from '@/hooks/useCards'
import { fmt, fmtDate, todayStr } from '@/lib/utils'
import { CATS, MONTHS, CARD_COLORS, CARD_ICONS } from '@/constants'
import { CreditCard, CardForm, CardTxForm }       from '@/types'
import { ToastType } from '@/hooks/useToast'

interface Props {
  showToast: (msg: string, type?: ToastType) => void
}

const EMPTY_CARD_FORM: CardForm = {
  name: '', lastDigits: '', limit: '', closingDay: '10', dueDay: '20', color: '#00C39A', icon: '💳',
}
const EMPTY_TX_FORM: CardTxForm = {
  description: '', amount: '', category: CATS.despesa[0], date: todayStr(), note: '',
}

/** Resolve which invoice month a purchase falls into based on card closing day */
function resolveInvoiceMonth(purchaseDate: string, closingDay: number): string {
  const [y, m, d] = purchaseDate.split('-').map(Number)
  if (d > closingDay) {
    const next = new Date(y, m, 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

function previewInvoiceMonthLabel(date: string, closingDay: number): string {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  if (d > closingDay) {
    const next = new Date(y, m, 1)
    return `${MONTHS[next.getMonth()]} ${next.getFullYear()}`
  }
  return `${MONTHS[m - 1]} ${y}`
}

export function CardsPage({ showToast }: Props) {
  const {
    cards, cardInvoices, loadingCards, loadingInvoices,
    loadCards, loadInvoices, createCard, updateCard, deleteCard,
    addCardTransaction, payInvoice,
  } = useCards()

  const [selectedCard,  setSelectedCard]  = useState<CreditCard | null>(null)
  const [openInvoice,   setOpenInvoice]   = useState<string | null>(null)

  // Card form modal
  const [cardFormOpen, setCardFormOpen] = useState(false)
  const [editingCard,  setEditingCard]  = useState<CreditCard | null>(null)
  const [cardForm,     setCardForm]     = useState<CardForm>(EMPTY_CARD_FORM)
  const [savingCard,   setSavingCard]   = useState(false)

  // Transaction modal
  const [txOpen,    setTxOpen]    = useState(false)
  const [txForm,    setTxForm]    = useState<CardTxForm>(EMPTY_TX_FORM)
  const [savingTx,  setSavingTx]  = useState(false)

  useEffect(() => {
    loadCards().catch(() => showToast('Erro ao carregar cartões.', 'err'))
  }, []) // eslint-disable-line

  // ── Handlers ────────────────────────────────────────────────────────
  const handleSelectCard = (card: CreditCard) => {
    setSelectedCard(card)
    setOpenInvoice(null)
    loadInvoices(card.id).catch(() => showToast('Erro ao carregar faturas.', 'err'))
  }

  const handleSaveCard = async () => {
    if (!cardForm.name.trim())                             return showToast('Informe o nome!', 'err')
    if (!cardForm.limit || parseFloat(cardForm.limit) <= 0) return showToast('Informe o limite!', 'err')
    setSavingCard(true)
    try {
      if (editingCard) {
        await updateCard(editingCard.id, cardForm)
        showToast('✏️ Cartão atualizado!', 'ok')
      } else {
        await createCard(cardForm)
        showToast('💳 Cartão criado!', 'ok')
      }
      setCardFormOpen(false)
      setEditingCard(null)
      setCardForm(EMPTY_CARD_FORM)
      await loadCards()
    } catch {
      showToast('Erro ao salvar cartão.', 'err')
    } finally {
      setSavingCard(false)
    }
  }

  const handleDeleteCard = async (id: string) => {
    try {
      await deleteCard(id)
      if (selectedCard?.id === id) { setSelectedCard(null) }
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

  const handleAddTx = async () => {
    if (!selectedCard)                                            return showToast('Selecione um cartão!', 'err')
    if (!txForm.description.trim())                               return showToast('Informe a descrição!', 'err')
    if (!txForm.amount || parseFloat(txForm.amount) <= 0)         return showToast('Informe o valor!', 'err')
    setSavingTx(true)
    try {
      await addCardTransaction(selectedCard.id, txForm)
      setTxOpen(false)
      setTxForm(EMPTY_TX_FORM)
      showToast('💳 Lançamento adicionado!', 'ok')
      await loadInvoices(selectedCard.id)
      await loadCards()
    } catch {
      showToast('Erro ao lançar no cartão.', 'err')
    } finally {
      setSavingTx(false)
    }
  }

  const handlePayInvoice = async (cardId: string, month: string) => {
    try {
      await payInvoice(cardId, month)
      showToast('✅ Fatura marcada como paga!', 'ok')
      await loadInvoices(cardId)
    } catch {
      showToast('Erro ao pagar fatura.', 'err')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* ── Card list (left column) ── */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <Card className="flex items-center justify-between py-4 px-5 bg-[#0F172A]/80 backdrop-blur-sm border border-white/5 rounded-2xl">
            <CardTitle className="mb-0 text-[#00C39A] flex items-center gap-2">
              <span>🃏</span> Meus Cartões
            </CardTitle>
            <Button
              size="sm"
              onClick={() => { setEditingCard(null); setCardForm(EMPTY_CARD_FORM); setCardFormOpen(true) }}
              className="bg-[#00C39A] hover:bg-[#00D4A8] text-white font-semibold rounded-lg"
            >
              + Novo
            </Button>
          </Card>

          {loadingCards
            ? <Card className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6"><Spinner /></Card>
            : cards.length === 0
              ? (
                <Card className="text-center py-10 bg-[#0F172A]/80 border border-white/5 rounded-2xl">
                  <p className="text-slate-500 text-sm mb-3">Nenhum cartão cadastrado.</p>
                  <Button 
                    size="sm" 
                    onClick={() => setCardFormOpen(true)}
                    className="bg-[#00C39A] hover:bg-[#00D4A8] text-white"
                  >
                    Adicionar cartão
                  </Button>
                </Card>
              )
              : cards.map(card => {
                const inv        = card.invoices[0]
                const used       = inv?.total || 0
                const p          = card.limit > 0 ? Math.min((used / card.limit) * 100, 100) : 0
                const isSelected = selectedCard?.id === card.id

                return (
                  <div
                    key={card.id}
                    onClick={() => handleSelectCard(card)}
                    className={[
                      'rounded-2xl p-5 cursor-pointer transition-all border hover:-translate-y-0.5 hover:shadow-lg',
                      isSelected
                        ? 'border-[#00C39A] ring-2 ring-[#00C39A]/30 shadow-lg shadow-[#00C39A]/10'
                        : 'border-white/10 hover:border-[#00C39A]/50',
                    ].join(' ')}
                    style={{ background: '#0F172A' }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
                          style={{ background: card.color + '25', border: `2px solid ${card.color}` }}
                        >
                          {card.icon}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{card.name}</div>
                          <div className="text-xs text-slate-500">
                            {card.lastDigits ? `•••• ${card.lastDigits}` : 'Sem número'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); openEditCard(card) }}
                          className="text-slate-500 hover:text-[#00C39A] transition-colors p-1 rounded-lg hover:bg-[#00C39A]/10"
                        >✏️</button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteCard(card.id) }}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                        >🗑</button>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Utilizado</span>
                      <span>{fmt(used)} / {fmt(card.limit)}</span>
                    </div>
                    <div className="bg-[#1E293B] rounded-full h-2 overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.toFixed(1)}%`, background: p > 90 ? '#ef4444' : p > 70 ? '#f59e0b' : card.color }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: card.color }} className="font-bold">{p.toFixed(1)}% usado</span>
                      <span className="text-slate-500">Livre: {fmt(card.limit - used)}</span>
                    </div>
                    <div className="flex gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
                      <span>📅 Fecha dia {card.closingDay}</span>
                      <span>💰 Vence dia {card.dueDay}</span>
                    </div>
                    {inv && (
                      <div className={`mt-3 px-3 py-2 rounded-xl text-xs font-bold text-center ${inv.paid ? 'bg-[#00C39A]/20 text-[#00C39A]' : 'bg-red-500/15 text-red-400'}`}>
                        {inv.paid ? '✅ Fatura paga' : `⚠️ Fatura aberta: ${fmt(inv.total)}`}
                      </div>
                    )}
                  </div>
                )
              })
          }
        </div>

        {/* ── Invoices (right columns) ── */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {!selectedCard
            ? (
              <Card className="flex flex-col items-center justify-center py-24 text-slate-500 bg-[#0F172A]/80 border border-white/5 rounded-2xl">
                <div className="text-5xl mb-4 opacity-50">🃏</div>
                <p className="font-semibold mb-1 text-white">Selecione um cartão</p>
                <p className="text-xs">Clique em um cartão para ver as faturas</p>
              </Card>
            )
            : (
              <>
                {/* Card header */}
                <Card 
                  className="bg-[#0F172A]/80 border rounded-2xl p-5"
                  style={{ borderColor: selectedCard.color + '40' }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                        style={{ background: selectedCard.color + '20', border: `2px solid ${selectedCard.color}` }}
                      >
                        {selectedCard.icon}
                      </div>
                      <div>
                        <div className="text-lg font-black text-white">{selectedCard.name}</div>
                        <div className="text-xs text-slate-400">
                          {selectedCard.lastDigits ? `•••• ${selectedCard.lastDigits}` : 'Cartão'}
                          {' '}· Limite:{' '}
                          <span className="text-white font-bold">{fmt(selectedCard.limit)}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Fecha dia {selectedCard.closingDay} · Vence dia {selectedCard.dueDay}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => setTxOpen(true)}
                      className="font-semibold rounded-xl"
                      style={{ background: selectedCard.color }}
                    >
                      + Lançar Despesa
                    </Button>
                  </div>
                </Card>

                {/* Invoices */}
                <Card className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-5">
                  <CardTitle className="text-[#00C39A] flex items-center gap-2 mb-4">
                    <span>📋</span> Faturas
                  </CardTitle>
                  {loadingInvoices
                    ? <Spinner />
                    : cardInvoices.length === 0
                      ? <EmptyState message="Nenhuma fatura ainda. Lance uma despesa para começar." />
                      : cardInvoices.map(inv => {
                        const isOpen = openInvoice === inv.month
                        const [y, m] = inv.month.split('-')
                        const label  = `${MONTHS[parseInt(m) - 1]} ${y}`

                        return (
                          <div key={inv.month} className="mb-3 rounded-xl overflow-hidden border border-white/5">
                            <div
                              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                              style={{ background: '#0B1120' }}
                              onClick={() => setOpenInvoice(isOpen ? null : inv.month)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-sm text-white">{label}</span>
                                <Badge variant={inv.paid ? 'green' : 'red'}>
                                  {inv.paid ? '✅ Paga' : '🔴 Aberta'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 hidden sm:block">
                                  Vence dia {selectedCard.dueDay}/{m}/{y}
                                </span>
                                <span className="font-black text-sm text-red-400">{fmt(inv.total)}</span>
                                {!inv.paid && (
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={e => { e.stopPropagation(); handlePayInvoice(selectedCard.id, inv.month) }}
                                    className="bg-[#00C39A] hover:bg-[#00D4A8] text-white"
                                  >
                                    Pagar
                                  </Button>
                                )}
                                <span className="text-slate-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                              </div>
                            </div>

                            {isOpen && (
                              <div className="px-4 py-4" style={{ background: '#080D19' }}>
                                {(!inv.transactions || inv.transactions.length === 0)
                                  ? <EmptyState message="Nenhuma transação nesta fatura." />
                                  : (
                                    <>
                                      {inv.transactions.map(t => (
                                        <div
                                          key={t.id}
                                          className="flex justify-between items-center py-3 border-b border-white/5 last:border-0"
                                        >
                                          <div>
                                            <div className="text-sm font-semibold text-white">{t.description}</div>
                                            <div className="text-xs text-slate-500">{t.category} · {fmtDate(t.date)}</div>
                                          </div>
                                          <span className="text-red-400 font-bold text-sm">- {fmt(t.amount)}</span>
                                        </div>
                                      ))}
                                      <div className="flex justify-between items-center pt-4 mt-2 border-t border-white/10">
                                        <span className="text-xs text-slate-400 font-semibold uppercase">
                                          Total da Fatura
                                        </span>
                                        <span className="text-red-400 font-black">{fmt(inv.total)}</span>
                                      </div>
                                    </>
                                  )
                                }
                              </div>
                            )}
                          </div>
                        )
                      })
                  }
                </Card>
              </>
            )
          }
        </div>
      </div>

      {/* ── Card form modal ── */}
      <Modal
        open={cardFormOpen}
        onClose={() => { setCardFormOpen(false); setEditingCard(null) }}
        title={editingCard ? '✏️ Editar Cartão' : '💳 Novo Cartão'}
        footer={
          <>
            <Button variant="outline" onClick={() => { setCardFormOpen(false); setEditingCard(null) }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveCard} 
              loading={savingCard}
              className="bg-[#00C39A] hover:bg-[#00D4A8] text-white"
            >
              ✔ Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nome do Cartão"
            value={cardForm.name}
            onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Nubank, Inter Visa..."
            maxLength={40}
          />
          <Input
            label="Últimos 4 dígitos"
            value={cardForm.lastDigits}
            onChange={e => setCardForm(f => ({ ...f, lastDigits: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            placeholder="1234"
            maxLength={4}
          />
          <Input
            label="Limite (R$)"
            type="number"
            min="1"
            step="0.01"
            value={cardForm.limit}
            onChange={e => setCardForm(f => ({ ...f, limit: e.target.value }))}
            placeholder="0,00"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Dia de Fechamento"
              type="number"
              min="1"
              max="31"
              value={cardForm.closingDay}
              onChange={e => setCardForm(f => ({ ...f, closingDay: e.target.value }))}
            />
            <Input
              label="Dia de Vencimento"
              type="number"
              min="1"
              max="31"
              value={cardForm.dueDay}
              onChange={e => setCardForm(f => ({ ...f, dueDay: e.target.value }))}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CARD_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setCardForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${cardForm.color === c ? 'border-white scale-110 ring-2 ring-white/30' : 'border-transparent hover:scale-105'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Ícone</label>
            <div className="flex gap-2 flex-wrap">
              {CARD_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setCardForm(f => ({ ...f, icon: ic }))}
                  className={[
                    'w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all',
                    cardForm.icon === ic
                      ? 'border-[#00C39A] bg-[#00C39A]/20 ring-2 ring-[#00C39A]/30'
                      : 'border-slate-700 bg-[#1E293B] hover:bg-slate-700 hover:border-slate-600',
                  ].join(' ')}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Card transaction modal ── */}
      <Modal
        open={txOpen}
        onClose={() => setTxOpen(false)}
        title="💳 Lançar no Cartão"
        footer={
          <>
            <Button variant="outline" onClick={() => setTxOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleAddTx} 
              loading={savingTx}
              className="bg-[#00C39A] hover:bg-[#00D4A8] text-white"
            >
              ✔ Lançar
            </Button>
          </>
        }
      >
        {selectedCard && (
          <p className="text-xs text-slate-400 mb-4">
            {selectedCard.icon} {selectedCard.name}
            {selectedCard.lastDigits ? ` •••• ${selectedCard.lastDigits}` : ''}
            {' '}· Fecha dia {selectedCard.closingDay}
          </p>
        )}
        <div className="flex flex-col gap-4">
          <Input
            label="Descrição"
            value={txForm.description}
            onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ex: Supermercado, Netflix..."
            maxLength={60}
          />
          <Input
            label="Valor (R$)"
            type="number"
            min="0.01"
            step="0.01"
            value={txForm.amount}
            onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0,00"
          />
          <Select
            label="Categoria"
            value={txForm.category}
            onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))}
          >
            {CATS.despesa.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input
            label="Data da Compra"
            type="date"
            value={txForm.date}
            onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
          />
          <Input
            label="Observação (opcional)"
            value={txForm.note}
            onChange={e => setTxForm(f => ({ ...f, note: e.target.value }))}
            placeholder="Opcional..."
            maxLength={80}
          />
          {txForm.date && selectedCard && (
            <div className="p-3 rounded-xl bg-[#00C39A]/10 border border-[#00C39A]/20">
              <span className="text-xs text-[#00C39A]">
                📅 Cairá na fatura de:{' '}
                <strong className="text-white">
                  {previewInvoiceMonthLabel(txForm.date, selectedCard.closingDay)}
                </strong>
              </span>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
