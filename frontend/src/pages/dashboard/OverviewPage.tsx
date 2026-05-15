import { useEffect, useMemo, memo } from 'react'
import { Card, CardTitle, EmptyState, Spinner } from '@/components/ui'
import { useTransactions } from '@/hooks/useTransactions'
import { useAnnualSummary } from '@/hooks/useAnnualSummary'
import { useCards } from '@/hooks/useCards'
import { fmt, fmtDate } from '@/lib/utils'
import { CATEGORY_COLORS, PageId } from '@/constants'
import { MonthlySummary, Transaction } from '@/types'
import { ToastType } from '@/hooks/useToast'

interface Props {
  month: number
  year: number
  yearMonthStr: string
  showToast: (msg: string, type?: ToastType) => void
  onNavigate: (page: PageId) => void
}

// ── Annual chart (memoized) ──
const AnnualChart = memo(({ data }: { data: MonthlySummary[] }) => {
  if (!data.length) return <EmptyState message="Sem dados." />

  const W = 860,
    H = 200,
    PL = 60,
    PR = 20,
    PT = 16,
    PB = 36
  const iW = W - PL - PR
  const iH = H - PT - PB
  const allV = data.flatMap((d) => [d.receitas, d.despesas, Math.abs(d.saldo)])
  const maxV = Math.max(...allV, 1)
  const minV = Math.min(...data.map((d) => d.saldo), 0)
  const range = maxV - minV || 1
  const xP = (i: number) => PL + (i / Math.max(data.length - 1, 1)) * iW
  const yP = (v: number) => PT + iH - ((v - minV) / range) * iH
  const makePath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xP(i).toFixed(1)} ${yP(v).toFixed(1)}`).join(' ')

  const lines = [
    { values: data.map((d) => d.receitas), color: '#00C39A', label: '● Receitas' }, // primary-500
    { values: data.map((d) => d.despesas), color: '#ef4444', label: '● Despesas' },
    { values: data.map((d) => d.saldo), color: '#3b82f6', label: '● Saldo' },
  ]
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const yy = PT + (iH / 4) * i
    const val = maxV - (range / 4) * i
    return { yy, val }
  })

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 500 }}>
        {gridLines.map(({ yy, val }) => (
          <g key={yy}>
            <line x1={PL} y1={yy} x2={PL + iW} y2={yy} stroke="#374151" strokeWidth="1" />
            <text x={PL - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="#6b7280">
              {(val / 1000).toFixed(0)}k
            </text>
          </g>
        ))}
        {lines.map(({ values, color }) => (
          <g key={color}>
            <path d={makePath(values)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
            {values.map((v, i) => (
              <circle key={i} cx={xP(i)} cy={yP(v)} r="4" fill={color} stroke="#1f2937" strokeWidth="2" />
            ))}
          </g>
        ))}
        {data.map((d, i) => (
          <text key={i} x={xP(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#6b7280">
            {d.label}
          </text>
        ))}
      </svg>
      <div className="flex gap-5 mt-3 text-xs">
        {lines.map(({ color, label }) => (
          <span key={label} style={{ color }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
})

// ── Main ──
export function OverviewPage({ month, year, showToast, onNavigate }: Props) {
  const txHook = useTransactions()
  const summaryHook = useAnnualSummary()
  const cardsHook = useCards()

  useEffect(() => {
    txHook.load(year, month).catch(() => showToast('Erro ao carregar transações.', 'err'))
    summaryHook.load().catch(() => {})
    cardsHook.loadCards().catch(() => {})
  }, [month, year])

  const { transactions, loading } = txHook
  const recs = useMemo(() => transactions.filter((t) => t.type === 'receita'), [transactions])
  const desps = useMemo(() => transactions.filter((t) => t.type === 'despesa'), [transactions])
  const totR = useMemo(() => recs.reduce((s, t) => s + t.amount, 0), [recs])
  const totD = useMemo(() => desps.reduce((s, t) => s + t.amount, 0), [desps])
  const saldo = totR - totD
  const pct = totR > 0 ? Math.min((totD / totR) * 100, 100) : 0

  const catEntries = useMemo(() => {
    const map: Record<string, number> = {}
    desps.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [desps])

  // Cores dinâmicas baseadas no percentual
  const getPctConfig = () => {
    if (pct > 90) return { color: 'text-red-400', bg: 'linear-gradient(90deg,#ef4444,#f87171)', icon: '🔴' }
    if (pct > 70) return { color: 'text-amber-400', bg: 'linear-gradient(90deg,#f59e0b,#fbbf24)', icon: '🟡' }
    return { color: 'text-primary-400', bg: 'linear-gradient(90deg,#00C39A,#33cfaf)', icon: '🟢' }
  }
  const pctConfig = getPctConfig()

  const summaryCards = [
    {
      label: '📥 Receitas',
      value: fmt(totR),
      sub: `${recs.length} lançamento(s)`,
      color: 'text-primary-400',
      bgIcon: 'bg-primary-500/10',
    },
    {
      label: '📤 Despesas',
      value: fmt(totD),
      sub: `${desps.length} lançamento(s)`,
      color: 'text-red-400',
      bgIcon: 'bg-red-500/10',
    },
    {
      label: '💳 Saldo',
      value: fmt(saldo),
      sub: saldo >= 0 ? '👍 Positivo' : '⚠️ Negativo',
      color: saldo >= 0 ? 'text-blue-400' : 'text-red-400',
      bgIcon: saldo >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10',
    },
    {
      label: '📊 Comprometido',
      value: `${pct.toFixed(1)}%`,
      sub: 'da renda',
      color: pctConfig.color,
      bgIcon: pct > 90 ? 'bg-red-500/10' : pct > 70 ? 'bg-amber-500/10' : 'bg-primary-500/10',
    },
  ]

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c, i) => (
          <Card key={i} className="hover:-translate-y-1 transition-transform duration-200">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">{c.label}</div>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.sub}</div>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <Card>
        <CardTitle>⚡ Comprometimento da Renda</CardTitle>
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Despesas vs Receitas</span>
          <span className={pctConfig.color}>{pct.toFixed(1)}%</span>
        </div>
        <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pctConfig.bg }}
          />
        </div>
        <div className={`text-xs mt-2 ${pctConfig.color}`}>
          {pct > 90
            ? `${pctConfig.icon} Atenção: renda quase totalmente comprometida!`
            : pct > 70
              ? `${pctConfig.icon} Cuidado: mais de 70% da renda em despesas.`
              : `${pctConfig.icon} Ótimo! Você está dentro de uma margem saudável.`}
        </div>
      </Card>

      {/* Categories + Recent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardTitle>🍩 Despesas por Categoria</CardTitle>
          {catEntries.length === 0 ? (
            <EmptyState message="Sem despesas este mês." />
          ) : (
            catEntries.map(([cat, val]) => (
              <div key={cat} className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{cat}</span>
                  <span className="font-medium">{fmt(val)}</span>
                </div>
                <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${((val / catEntries[0][1]) * 100).toFixed(1)}%`,
                      background: CATEGORY_COLORS[cat] || '#00C39A',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </Card>

        <Card style={{ maxHeight: 380, overflowY: 'auto' }}>
          <CardTitle
            className="sticky top-0 z-10 pb-2 -mt-1 pt-1"
            style={{ background: 'linear-gradient(to bottom, #1f2937 80%, transparent)' }}
          >
            🕐 Últimas Transações
          </CardTitle>
          {loading ? (
            <Spinner />
          ) : transactions.length === 0 ? (
            <EmptyState message="Sem transações este mês." />
          ) : (
            [...transactions]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 8)
              .map((t) => <TransactionRow key={t.id} t={t} />)
          )}
        </Card>
      </div>

      {/* Cards summary */}
      {cardsHook.cards.length > 0 && (
        <Card>
          <CardTitle>🃏 Cartões de Crédito</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cardsHook.cards.map((card) => {
              const inv = card.invoices[0]
              const used = inv?.total || 0
              const p = card.limit > 0 ? Math.min((used / card.limit) * 100, 100) : 0
              const barColor = p > 90 ? '#ef4444' : p > 70 ? '#f59e0b' : '#00C39A'

              return (
                <div
                  key={card.id}
                  onClick={() => onNavigate('cards')}
                  className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 cursor-pointer hover:border-primary-500/50 hover:bg-gray-800/70 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: card.color + '20', border: `2px solid ${card.color}` }}
                    >
                      {card.icon}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-200">{card.name}</div>
                      <div className="text-xs text-gray-500">
                        {card.lastDigits ? `•••• ${card.lastDigits}` : 'Sem número'}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-full h-1.5 overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${p.toFixed(1)}%`, background: barColor }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">{fmt(used)} usado</span>
                    <span style={{ color: barColor }} className="font-bold">
                      {p.toFixed(0)}%
                    </span>
                  </div>
                  {inv && !inv.paid && (
                    <div className="mt-2 text-[10px] text-red-400 font-semibold">
                      ⚠️ Fatura aberta: {fmt(inv.total)}
                    </div>
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
  const isReceita = t.type === 'receita'

  return (
    <div
      className={`
        flex justify-between items-center rounded-xl px-3 py-2.5 mb-2 border-l-4
        bg-gray-800/40 hover:bg-gray-800/60 transition-colors
        ${isReceita ? 'border-primary-500' : 'border-red-500'}
      `}
    >
      <div>
        <div className="text-sm font-semibold text-gray-200">{t.description}</div>
        <div className="text-xs text-gray-500">
          {t.category} · {fmtDate(t.date)}
        </div>
      </div>
      <span className={`font-bold text-sm ${isReceita ? 'text-primary-400' : 'text-red-400'}`}>
        {isReceita ? '+' : '-'} {fmt(t.amount)}
      </span>
    </div>
  )
}
