import { useEffect, useState } from 'react'
import { Card, CardTitle, Button, Input, Select, Modal, EmptyState, Spinner } from '@/components/ui'
import { useGoals }  from '@/hooks/useGoals'
import { fmt }       from '@/lib/utils'
import { ToastType } from '@/hooks/useToast'

interface Props {
  showToast: (msg: string, type?: ToastType) => void
}

const GOAL_ICONS = [
  { value: '✈️', label: '✈️ Viagem' },
  { value: '🏠', label: '🏠 Casa / Imóvel' },
  { value: '🚗', label: '🚗 Carro' },
  { value: '🏍️', label: '🏍️ Moto' },
  { value: '📱', label: '📱 Eletrônico' },
  { value: '🎓', label: '🎓 Educação' },
  { value: '💍', label: '💍 Casamento' },
  { value: '🛡️', label: '🛡️ Reserva de Emergência' },
  { value: '💰', label: '💰 Investimento' },
  { value: '🎯', label: '🎯 Outro' },
]

const EMPTY_FORM = { name: '', target: '', deadline: '', icon: '🎯' }

export function GoalsPage({ showToast }: Props) {
  const { goals, loading, load, create, contribute, remove } = useGoals()

  const [form,   setForm]   = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Contribution modal
  const [modalGoalId,   setModalGoalId]   = useState<string | null>(null)
  const [aporteAmount,  setAporteAmount]  = useState('')
  const [savingAporte,  setSavingAporte]  = useState(false)

  useEffect(() => {
    load().catch(() => showToast('Erro ao carregar metas.', 'err'))
  }, []) // eslint-disable-line

  const handleCreate = async () => {
    if (!form.name.trim())                        return showToast('Informe o nome!', 'err')
    if (!form.target || parseFloat(form.target) <= 0) return showToast('Informe o valor alvo!', 'err')
    setSaving(true)
    try {
      await create({
        name:     form.name,
        target:   parseFloat(form.target),
        deadline: form.deadline || undefined,
        icon:     form.icon,
      })
      setForm(EMPTY_FORM)
      showToast('🎯 Meta criada!', 'ok')
      await load()
    } catch {
      showToast('Erro ao criar meta.', 'err')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      showToast('🗑 Meta removida', 'info')
      await load()
    } catch {
      showToast('Erro ao remover meta.', 'err')
    }
  }

  const handleContribute = async () => {
    if (!modalGoalId || !aporteAmount || parseFloat(aporteAmount) <= 0)
      return showToast('Informe um valor válido!', 'err')
    setSavingAporte(true)
    try {
      await contribute(modalGoalId, parseFloat(aporteAmount))
      setModalGoalId(null)
      setAporteAmount('')
      showToast('💰 Aporte registrado!', 'ok')
      await load()
    } catch {
      showToast('Erro ao registrar aporte.', 'err')
    } finally {
      setSavingAporte(false)
    }
  }

  // Summary
  const totalTarget  = goals.reduce((s, g) => s + g.target, 0)
  const totalCurrent = goals.reduce((s, g) => s + g.current, 0)
  const concluded    = goals.filter(g => g.current >= g.target).length
  const overallPct   = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0

  const modalGoal = goals.find(g => g.id === modalGoalId)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Form ── */}
        <Card className="bg-[#0F172A]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
          <CardTitle className="text-[#00C39A] flex items-center gap-2 mb-4">
            <span className="text-xl">🎯</span>
            Nova Meta
          </CardTitle>
          <div className="flex flex-col gap-4">
            <Input
              label="Nome da Meta"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Viagem, Reserva..."
              maxLength={50}
            />
            <Input
              label="Valor Alvo (R$)"
              type="number"
              min="1"
              step="0.01"
              value={form.target}
              onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
              placeholder="0,00"
            />
            <Input
              label="Data Limite (opcional)"
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
            />
            <Select
              label="Ícone"
              value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
            >
              {GOAL_ICONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Button
              className="w-full justify-center mt-2 bg-gradient-to-r from-[#00C39A] to-[#00A383] hover:from-[#00D4A8] hover:to-[#00C39A] text-white font-semibold rounded-xl py-3 transition-all duration-300 shadow-lg shadow-[#00C39A]/20"
              onClick={handleCreate}
              loading={saving}
            >
              ✔ Criar Meta
            </Button>
          </div>
        </Card>

        {/* ── Overview ── */}
        <Card className="bg-[#0F172A]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
          <CardTitle className="text-[#00C39A] flex items-center gap-2 mb-4">
            <span className="text-xl">📊</span>
            Visão Geral
          </CardTitle>
          {goals.length === 0
            ? <EmptyState message="Nenhuma meta criada." />
            : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { v: goals.length,      l: 'Metas',      c: 'text-[#00C39A]', bg: 'bg-[#00C39A]/10' },
                    { v: concluded,         l: 'Concluídas', c: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { v: fmt(totalCurrent), l: 'Captado',    c: 'text-amber-400', bg: 'bg-amber-500/10' },
                  ].map(({ v, l, c, bg }) => (
                    <div key={l} className={`text-center ${bg} rounded-xl p-4 border border-white/5`}>
                      <div className={`text-2xl font-black ${c}`}>{v}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{l}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Total: <span className="text-white font-semibold">{fmt(totalCurrent)}</span> de <span className="text-white font-semibold">{fmt(totalTarget)}</span>
                </p>
                <div className="bg-[#1E293B] rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00C39A] to-[#00D4A8] transition-all duration-500"
                    style={{ width: `${Math.min(overallPct, 100).toFixed(1)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 text-right">
                  <span className="text-[#00C39A] font-bold">{overallPct.toFixed(1)}%</span> do total
                </p>
              </>
            )
          }
        </Card>
      </div>

      {/* ── Goals grid ── */}
      <Card className="bg-[#0F172A]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-6 mt-6">
        <CardTitle className="text-[#00C39A] flex items-center gap-2 mb-4">
          <span className="text-xl">🎯</span>
          Minhas Metas
        </CardTitle>
        {loading
          ? <Spinner />
          : goals.length === 0
            ? <EmptyState message="Nenhuma meta criada ainda." />
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.map(g => {
                  const pct  = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0
                  const done = g.current >= g.target
                  const dias = g.deadline
                    ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000)
                    : null
                  const barColor = done ? '#00C39A' : pct > 50 ? '#00C39A' : '#f59e0b'

                  return (
                    <div key={g.id} className="bg-[#0B1120] rounded-2xl p-5 border border-white/5 relative hover:border-[#00C39A]/30 transition-colors">
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="absolute top-3 right-3 text-slate-600 hover:text-red-400 transition-colors text-sm p-1 rounded-lg hover:bg-red-500/10"
                      >🗑</button>

                      <div className="text-3xl mb-3">{g.icon}</div>
                      <div className="font-bold mb-2 pr-6 text-white">
                        {g.name}
                        {done && (
                          <span className="ml-2 text-xs bg-[#00C39A]/20 text-[#00C39A] px-2 py-0.5 rounded-full">
                            ✓ Concluída
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between text-xs text-slate-400 mb-2">
                        <span>{fmt(g.current)} captado</span>
                        <span>Meta: {fmt(g.target)}</span>
                      </div>

                      <div className="bg-[#1E293B] rounded-full h-2.5 overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct.toFixed(1)}%`, background: barColor }}
                        />
                      </div>

                      <div className="flex justify-between text-xs mb-3">
                        <span style={{ color: barColor }} className="font-bold">{pct.toFixed(1)}%</span>
                        <span className="text-slate-500">
                          {done ? '🎉 Concluída!' : `Faltam ${fmt(g.target - g.current)}`}
                        </span>
                      </div>

                      {dias !== null && (
                        <p className={[
                          'text-xs mb-3',
                          dias < 0 ? 'text-red-400' : dias < 30 ? 'text-amber-400' : 'text-slate-500',
                        ].join(' ')}>
                          {dias < 0 ? '⚠️ Prazo vencido' : dias === 0 ? '📅 Vence hoje' : `📅 ${dias} dias restantes`}
                        </p>
                      )}

                      {!done && (
                        <button
                          onClick={() => setModalGoalId(g.id)}
                          className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#00C39A]/15 text-[#00C39A] hover:bg-[#00C39A] hover:text-white transition-all duration-200"
                        >
                          💰 Registrar Aporte
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
        }
      </Card>

      {/* ── Contribution Modal ── */}
      <Modal
        open={!!modalGoalId}
        onClose={() => { setModalGoalId(null); setAporteAmount('') }}
        title="💰 Registrar Aporte"
        footer={
          <>
            <Button variant="outline" onClick={() => { setModalGoalId(null); setAporteAmount('') }}>
              Cancelar
            </Button>
            <Button 
              variant="success" 
              onClick={handleContribute} 
              loading={savingAporte}
              className="bg-[#00C39A] hover:bg-[#00D4A8] text-white"
            >
              ✔ Confirmar
            </Button>
          </>
        }
      >
        {modalGoal && (
          <p className="text-sm text-slate-400 mb-4">
            {modalGoal.icon} <strong className="text-white">{modalGoal.name}</strong>
            {' '}· Faltam <strong className="text-[#00C39A]">{fmt(modalGoal.target - modalGoal.current)}</strong>
          </p>
        )}
        <Input
          label="Valor do Aporte (R$)"
          type="number"
          min="0.01"
          step="0.01"
          value={aporteAmount}
          onChange={e => setAporteAmount(e.target.value)}
          placeholder="0,00"
        />
      </Modal>
    </>
  )
}
