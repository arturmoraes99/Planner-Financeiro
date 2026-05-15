import { useEffect, useState, useMemo } from 'react'
import { Card, CardTitle, Button, Input, Select, Modal, EmptyState, Spinner, Badge } from '@/components/ui'
import { useTransactions } from '@/hooks/useTransactions'
import { useAnnualSummary } from '@/hooks/useAnnualSummary'
import { fmt, fmtDate, todayStr } from '@/lib/utils'
import { CATS } from '@/constants'
import { Transaction, TransactionType } from '@/types'
import { ToastType } from '@/hooks/useToast'

interface Props {
  month: number
  year: number
  yearMonthStr: string
  showToast: (msg: string, type?: ToastType) => void
}

const EMPTY_FORM = {
  description: '',
  amount: '',
  category: CATS.receita[0],
  date: todayStr(),
  note: '',
}

export function TransactionsPage({ month, year, showToast }: Props) {
  const { transactions, pagination, currentPage, loading, load, create, update, remove } = useTransactions()
  const { load: loadSummary } = useAnnualSummary()

  const [tab, setTab] = useState<TransactionType>('receita')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)

  const [filterType, setFilterType] = useState<'all' | TransactionType>('all')

  useEffect(() => {
    load(year, month, 1).catch(() => showToast('Erro ao carregar transações.', 'err'))
  }, [month, year])

  const reload = async (pg = currentPage) => {
    await load(year, month, pg)
    await loadSummary()
  }

  const handleAdd = async () => {
    if (!form.description.trim()) return showToast('Informe a descrição!', 'err')
    if (!form.amount || +form.amount <= 0) return showToast('Informe um valor válido!', 'err')
    if (!form.date) return showToast('Informe a data!', 'err')
    setSaving(true)
    try {
      await create({
        type: tab,
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        date: form.date,
        note: form.note || undefined,
      })
      setForm({ ...EMPTY_FORM, date: todayStr() })
      showToast(tab === 'receita' ? '📥 Receita adicionada!' : '📤 Despesa adicionada!', 'ok')
      await reload(1)
    } catch {
      showToast('Erro ao salvar transação.', 'err')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      showToast('🗑 Removido', 'info')
      await reload()
    } catch {
      showToast('Erro ao remover.', 'err')
    }
  }

  const openEdit = (t: Transaction) => {
    setEditing(t)
    setEditForm({
      description: t.description,
      amount: String(t.amount),
      category: t.category,
      date: t.date,
      note: t.note || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    if (!editForm.description.trim()) return showToast('Informe a descrição!', 'err')
    if (!editForm.amount || +editForm.amount <= 0) return showToast('Informe um valor válido!', 'err')
    setEditSaving(true)
    try {
      await update(editing.id, {
        type: editing.type,
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        category: editForm.category,
        date: editForm.date,
        note: editForm.note || null,
      })
      setEditing(null)
      showToast('✏️ Transação atualizada!', 'ok')
      await reload()
    } catch {
      showToast('Erro ao atualizar.', 'err')
    } finally {
      setEditSaving(false)
    }
  }

  const filtered = useMemo(
    () => (filterType === 'all' ? transactions : transactions.filter((t) => t.type === filterType)),
    [transactions, filterType]
  )

  const tabCats = tab === 'receita' ? CATS.receita : CATS.despesa
  const editCats = editing ? (editing.type === 'receita' ? CATS.receita : CATS.despesa) : CATS.receita

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Form ── */}
        <Card>
          <CardTitle>➕ Nova Transação</CardTitle>

          {/* Type toggle */}
          <div className="flex gap-2 mb-4">
            {(['receita', 'despesa'] as TransactionType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t)
                  setForm((f) => ({
                    ...f,
                    category: t === 'receita' ? CATS.receita[0] : CATS.despesa[0],
                  }))
                }}
                className={`
                  flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all border-2
                  ${
                    t === 'receita'
                      ? tab === 'receita'
                        ? 'bg-primary-500/20 text-primary-400 border-primary-500'
                        : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:border-gray-600'
                      : tab === 'despesa'
                        ? 'bg-red-500/20 text-red-400 border-red-500'
                        : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                {t === 'receita' ? '📥 Receita' : '📤 Despesa'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Input
              label="Descrição"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Salário, Supermercado..."
              maxLength={60}
            />
            <Input
              label="Valor (R$)"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0,00"
              min="0.01"
              step="0.01"
            />
            <Select
              label="Categoria"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {tabCats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input
              label="Data"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <Input
              label="Observação (opcional)"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Nota adicional..."
              maxLength={80}
            />
            <Button
              variant={tab === 'receita' ? 'primary' : 'danger'}
              className="w-full justify-center mt-1"
              onClick={handleAdd}
              loading={saving}
            >
              ✔ Adicionar {tab === 'receita' ? 'Receita' : 'Despesa'}
            </Button>
          </div>
        </Card>

        {/* ── List ── */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="mb-0">📋 Transações do Mês</CardTitle>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="rounded-lg px-3 py-1.5 text-xs outline-none border border-gray-700 bg-gray-800 text-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors"
            >
              <option value="all">Todos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 440 }}>
            {loading ? (
              <Spinner />
            ) : filtered.length === 0 ? (
              <EmptyState message="Nenhuma transação encontrada." />
            ) : (
              [...filtered]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((t) => (
                  <TransactionRow key={t.id} t={t} onEdit={openEdit} onDelete={handleDelete} />
                ))
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
              <span className="text-xs text-gray-500">
                {pagination.total} transações · pág. {pagination.page}/{pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => load(year, month, currentPage - 1)}
                >
                  ‹ Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => load(year, month, currentPage + 1)}
                >
                  Próxima ›
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Edit Modal ── */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`✏️ Editar Transação ${editing?.type === 'receita' ? '(Receita)' : '(Despesa)'}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} loading={editSaving}>
              ✔ Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Descrição"
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            maxLength={60}
          />
          <Input
            label="Valor (R$)"
            type="number"
            value={editForm.amount}
            onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
            min="0.01"
            step="0.01"
          />
          <Select
            label="Categoria"
            value={editForm.category}
            onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
          >
            {editCats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input
            label="Data"
            type="date"
            value={editForm.date}
            onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Input
            label="Observação"
            value={editForm.note}
            onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Opcional..."
            maxLength={80}
          />
        </div>
      </Modal>
    </>
  )
}

// ── Row component ──
function TransactionRow({
  t,
  onEdit,
  onDelete,
}: {
  t: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}) {
  const isReceita = t.type === 'receita'

  return (
    <div
      className={`
        flex justify-between items-center rounded-xl px-3 py-2.5 mb-2
        border-l-4 transition-all group
        bg-gray-800/40 hover:bg-gray-800/70
        ${isReceita ? 'border-primary-500' : 'border-red-500'}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-200 truncate">{t.description}</div>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          <span className="text-xs text-gray-500">
            {t.category} · {fmtDate(t.date)}
          </span>
          {t.source === 'invoice_import' && <Badge variant="primary">📄 fatura</Badge>}
          {t.cardId && <Badge variant="primary">💳 cartão</Badge>}
          {t.note && <span className="text-xs text-gray-600">· {t.note}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        <span className={`font-bold text-sm ${isReceita ? 'text-primary-400' : 'text-red-400'}`}>
          {isReceita ? '+' : '-'} {fmt(t.amount)}
        </span>
        <button
          onClick={() => onEdit(t)}
          className="text-gray-600 hover:text-primary-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Editar"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(t.id)}
          className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Remover"
        >
          🗑
        </button>
      </div>
    </div>
  )
}
