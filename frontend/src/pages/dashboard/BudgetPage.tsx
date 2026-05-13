import { useEffect, useMemo } from 'react'
import { Card, CardTitle, Button, Select, Input, EmptyState, Badge } from '@/components/ui'
import { useBudgets }      from '@/hooks/useBudgets'
import { useTransactions } from '@/hooks/useTransactions'
import { fmt }             from '@/lib/utils'
import { CATS }            from '@/constants'
import { ToastType }       from '@/hooks/useToast'
import { useState }        from 'react'

interface Props {
  month: number
  year: number
  yearMonthStr: string
  showToast: (msg: string, type?: ToastType) => void
}

export function BudgetPage({ month, year, yearMonthStr, showToast }: Props) {
  const { budgets, loading, load, upsert, remove } = useBudgets()
  const { transactions, load: loadTx }             = useTransactions()

  const [budgetCat,   setBudgetCat]   = useState(CATS.despesa[0])
  const [budgetLimit, setBudgetLimit] = useState('')
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    load(yearMonthStr).catch(() => showToast('Erro ao carregar orçamentos.', 'err'))
    loadTx(year, month, 1).catch(() => {})
  }, [yearMonthStr]) // eslint-disable-line

  // Spending per category this month
  const spending = useMemo(() => {
    const map: Record<string, number> = {}
    transactions
      .filter(t => t.type === 'despesa')
      .forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return map
  }, [transactions])

  const handleSave = async () => {
    if (!budgetLimit || parseFloat(budgetLimit) <= 0)
      return showToast('Informe o limite!', 'err')
    setSaving(true)
    try {
      await upsert(budgetCat, parseFloat(budgetLimit), yearMonthStr)
      setBudgetLimit('')
      showToast('💰 Orçamento salvo!', 'ok')
      await load(yearMonthStr)
    } catch {
      showToast('Erro ao salvar orçamento.', 'err')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      showToast('🗑 Orçamento removido', 'info')
      await load(yearMonthStr)
    } catch {
      showToast('Erro ao remover.', 'err')
    }
  }

  // Summary totals
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + (spending[b.category] || 0), 0)
  const overCount  = budgets.filter(b => (spending[b.category] || 0) > b.limit).length

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Form ── */}
        <Card>
          <CardTitle>🎚️ Definir Limite por Categoria</CardTitle>
          <p className="text-xs text-slate-400 mb-4">
            Mês: <span className="text-blue-300 font-bold">{yearMonthStr}</span>
          </p>
          <div className="flex flex-col gap-3">
            <Select
              label="Categoria"
              value={budgetCat}
              onChange={e => setBudgetCat(e.target.value)}
            >
              {CATS.despesa.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input
              label="Limite (R$)"
              type="number"
              min="1"
              step="0.01"
              value={budgetLimit}
              onChange={e => setBudgetLimit(e.target.value)}
              placeholder="0,00"
            />
            <Button
              className="w-full justify-center mt-1"
              onClick={handleSave}
              loading={saving}
            >
              ✔ Salvar Orçamento
            </Button>
          </div>
        </Card>

        {/* ── Summary ── */}
        <Card>
          <CardTitle>📊 Resumo do Mês</CardTitle>
          {budgets.length === 0
            ? <EmptyState message="Nenhum orçamento definido para este mês." />
            : (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { v: fmt(totalLimit), l: 'Total Orçado',      c: 'text-blue-400'   },
                  { v: fmt(totalSpent), l: 'Gasto no Mês',      c: 'text-red-400'    },
                  { v: overCount,       l: 'Categ. Estouradas', c: 'text-yellow-400' },
                ].map(({ v, l, c }) => (
                  <div key={l} className="text-center bg-slate-900/60 rounded-xl p-4">
                    <div className={`text-xl font-black ${c}`}>{v}</div>
                    <div className="text-xs text-slate-500 mt-1">{l}</div>
                  </div>
                ))}
              </div>
            )
          }
        </Card>
      </div>

      {/* ── Budget list ── */}
      <Card>
        <CardTitle>📋 Orçamentos Definidos</CardTitle>
        {loading
          ? <EmptyState message="Carregando..." />
          : budgets.length === 0
            ? <EmptyState message="Nenhum orçamento cadastrado." />
            : (
              <div className="flex flex-col gap-3">
                {budgets.map(b => {
                  const spent    = spending[b.category] || 0
                  const p        = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : 0
                  const over     = spent > b.limit
                  const barColor = over ? '#ef4444' : p > 80 ? '#f59e0b' : '#22c55e'

                  return (
                    <div key={b.id} className="bg-slate-900/60 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">{b.category}</span>
                          {over
                            ? <Badge variant="red">⚠️ Estourado</Badge>
                            : p > 80
                              ? <Badge variant="yellow">⚡ Atenção</Badge>
                              : <Badge variant="green">✅ OK</Badge>
                          }
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">
                            {fmt(spent)} / {fmt(b.limit)}
                          </span>
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors text-sm"
                          >🗑</button>
                        </div>
                      </div>
                      <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${p.toFixed(1)}%`, background: barColor }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span style={{ color: barColor }} className="font-bold">
                          {p.toFixed(1)}%
                        </span>
                        <span className="text-slate-500">
                          {over
                            ? `Excedeu ${fmt(spent - b.limit)}`
                            : `Restam ${fmt(b.limit - spent)}`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
        }
      </Card>
    </>
  )
}