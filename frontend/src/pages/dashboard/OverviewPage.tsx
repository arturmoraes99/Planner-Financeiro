import { useEffect, useMemo, memo } from 'react'
import { Card, CardTitle, EmptyState, Spinner } from '@/components/ui'
import { useTransactions }  from '@/hooks/useTransactions'
import { useAnnualSummary } from '@/hooks/useAnnualSummary'
import { useCards }         from '@/hooks/useCards'
import { fmt, fmtDate }     from '@/lib/utils'
import { CATEGORY_COLORS, MONTHS, PageId } from '@/constants'
import { MonthlySummary, Transaction } from '@/types'
import { ToastType } from '@/hooks/useToast'

interface Props {
  month: number
  year: number
  yearMonthStr: string
  showToast: (msg: string, type?: ToastType) => void
  onNavigate: (page: PageId) => void
}

// ── Annual chart (memoized, no re-render on unrelated state) ──────────
const AnnualChart = memo(({ data }: { data: MonthlySummary[] }) => {
  if (!data.length) return <EmptyState message="Sem dados." />

  const W = 860, H = 200, PL = 60, PR = 20, PT = 16, PB = 36
  const iW = W - PL - PR
  const iH = H - PT - PB
  const allV  = data.flatMap(d => [d.receitas, d.despesas, Math.abs(d.saldo)])
  const maxV  = Math.max(...allV, 1)
  const minV  = Math.min(...data.map(d => d.saldo), 0)
  const range = maxV - minV || 1
  const xP = (i: number) => PL + (i / Math.max(data.length - 1, 1)) * iW
  const yP = (v: number) => PT + iH - ((v - minV) / range) * iH
  const makePath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xP(i).toFixed(1)} ${yP(v).toFixed(1)}`).join(' ')

  const lines = [
    { values: data.map(d => d.receitas), color: '#22c55e', label: '● Receitas' },
    { values: data.map(d => d.despesas), color: '#ef4444', label: '● Despesas' },
    { values: data.map(d => d.saldo),    color: '#3b82f6', label: '● Saldo' },
  ]
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const yy  = PT + (iH / 4) * i
    const val = maxV - (range / 4) * i
    return { yy, val }
  })

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 500 }}>
        {gridLines.map(({ yy, val }) => (
          <g key={yy}>
            <line x1={PL} y1={yy} x2={PL + iW} y2={yy} stroke="#ffffff10" strokeWidth="1" />
            <text x={PL - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="#64748b">
              {(val / 1000).toFixed(0)}k
            </text>
          </g>
        ))}
        {lines.map(({ values, color }) => (
          <g key={color}>
            <path d={makePath(values)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
            {values.map((v, i) => (
              <circle key={i} cx={xP(i)} cy={yP(v)} r="4" fill={color} stroke="#1a2235" strokeWidth="2" />
            ))}
          </g>
        ))}
        {data.map((d, i) => (
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

// ── Main ──────────────────────────────────────────────────────────────
export function OverviewPage({ month, year, showToast, onNavigate }: Props) {
  const txHook      = useTransactions()
  const summaryHook = useAnnualSummary()
  const cardsHook   = useCards()

  useEffect(() => {
    txHook.load(year, month).catch(() => showToast('Erro ao carregar transações.', 'err'))
    summaryHook.load().catch(() => {})
    cardsHook.loadCards().catch(() => {})
  }, [month, year]) // eslint-disable-line

  const { transactions, loading } = txHook
  const recs  = useMemo(() => transactions.filter(t => t.type === 'receita'), [transactions])
  const desps = useMemo(() => transactions.filter(t => t.type === 'despesa'), [transactions])
  const totR  = useMemo(() => recs.reduce((s, t) => s + t.amount, 0), [recs])
  const totD  = useMemo(() => desps.reduce((s, t) => s + t.amount, 0), [desps])
  const saldo = totR - totD
  const pct   = totR > 0 ? Math.min((totD / totR) * 100, 100) : 0

  const catEntries = useMemo(() => {
    const map: Record<string, number> = {}
    desps.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [desps])

  const pctColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e'
  const pctBg    = pct > 90
    ? 'linear-gradient(90deg,#ef4444,#f87171)'
    : pct > 70
      ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
      : 'linear-gradient(90deg,#22c55e,#4ade80)'

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '📥 Receitas',     value: fmt(totR),  sub: `${recs.length} lançamento(s)`,   color: 'text-green-400' },
          { label: '📤 Despesas',     value: fmt(totD),  sub: `${desps.length} lançamento(s)`,  color: 'text-red-400' },
          { label: '💳 Saldo',        value: fmt(saldo), sub: saldo >= 0 ? '👍 Positivo' : '⚠️ Negativo', color: saldo >= 0 ? 'text-blue-400' : 'text-red-400' },
          { label: '📊 Comprometido', value: `${pct.toFixed(1)}%`, sub: 'da renda', color: pct > 90 ? 'text-red-400' : pct > 70 ? 'text-yellow-400' : 'text-green-400' },
        ].map((c, i) => (
          <Card key={i} className="hover:-translate-y-1 transition-transform">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">{c.label}</div>
            <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
            <div className="text-xs text-slate-500 mt-1">{c.sub}</div>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <Card>
        <CardTitle>⚡ Comprometimento da Renda</CardTitle>
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Despesas vs Receitas</span>
          <span>{pct.toFixed(1)}%</span>
        </div>
        <div className="bg-slate-900 rounded-full h-2.5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pctBg }} />
        </div>
        <div className="text-xs mt-2" style={{ color: pctColor }}>
          {pct > 90 ? '🔴 Atenção: renda quase totalmente comprometida!'
            : pct > 70 ? '🟡 Cuidado: mais de 70% da renda em despesas.'
            : '🟢 Ótimo! Você está dentro de uma margem saudável.'}
        </div>
      </Card>

      {/* Categories + Recent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardTitle>🍩 Despesas por Categoria</CardTitle>
          {catEntries.length === 0
            ? <EmptyState message="Sem despesas este mês." />
            : catEntries.map(([cat, val]) => (
              <div key={cat} className="mb-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{cat}</span><span>{fmt(val)}</span>
                </div>
                <div className="bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(val / catEntries[0][1] * 100).toFixed(1)}%`, background: CATEGORY_COLORS[cat] || '#64748b' }} />
                </div>
              </div>
            ))
          }
        </Card>

        <Card style={{ maxHeight: 380, overflowY: 'auto' }}>
          <CardTitle className="sticky top-0 pb-1" style={{ background: '#1a2235' }}>
            🕐 Últimas Transações
          </CardTitle>
          {loading
            ? <Spinner />
            : transactions.length === 0
              ? <EmptyState message="Sem transações este mês." />
              : [...transactions]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 8)
                  .map(t => <TransactionRow key={t.id} t={t} />)
          }
        </Card>
      </div>

      {/* Cards summary */}
      {cardsHook.cards.length > 0 && (
        <Card>
          <CardTitle>🃏 Cartões de Crédito</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cardsHook.cards.map(card => {
              const inv  = card.invoices[0]
              const used = inv?.total || 0
              const p    = card.limit > 0 ? Math.min((used / card.limit) * 100, 100) : 0
              return (
                <div key={card.id}
                  onClick={() => onNavigate('cards')}
                  className="bg-slate-900/60 rounded-xl p-4 border border-white/5 cursor-pointer hover:border-white/20 transition-all hover:-translate-y-0.5"
                >
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
                    <div className="h-full rounded-full" style={{ width: `${p.toFixed(1)}%`, background: p > 90 ? '#ef4444' : p > 70 ? '#f59e0b' : card.color }} />
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
        </Card>
      )}

      {/* Annual chart */}
      <Card>
        <CardTitle>📈 Histórico Anual (12 meses)</CardTitle>
        <AnnualChart data={summaryHook.annualData} />
      </Card>
    </>
  )
}

function TransactionRow({ t }: { t: Transaction }) {
  return (
    <div className={`flex justify-between items-center bg-slate-900/50 rounded-xl px-3 py-2.5 mb-2 border-l-4 ${t.type === 'receita' ? 'border-green-500' : 'border-red-500'}`}>
      <div>
        <div className="text-sm font-semibold">{t.description}</div>
        <div className="text-xs text-slate-500">{t.category} · {fmtDate(t.date)}</div>
      </div>
      <span className={`font-black text-sm ${t.type === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
        {t.type === 'receita' ? '+' : '-'} {fmt(t.amount)}
      </span>
    </div>
  )
}