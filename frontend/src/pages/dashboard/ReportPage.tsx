import { useEffect, useMemo } from 'react'
import { Card, CardTitle, Button, EmptyState, Spinner } from '@/components/ui'
import { useTransactions } from '@/hooks/useTransactions'
import { fmt, fmtDate }    from '@/lib/utils'
import { CATEGORY_COLORS, MONTHS } from '@/constants'
import { Transaction }     from '@/types'
import { ToastType }       from '@/hooks/useToast'
import { useAuth }         from '@/contexts/AuthContext'

interface Props {
  month: number
  year: number
  yearMonthStr: string
  showToast: (msg: string, type?: ToastType) => void
}

export function ReportPage({ month, year, showToast }: Props) {
  const { user }                                       = useAuth()
  const { transactions, loading, load }               = useTransactions()

  useEffect(() => {
    load(year, month, 1).catch(() => showToast('Erro ao carregar dados.', 'err'))
  }, [month, year]) // eslint-disable-line

  const recs  = useMemo(() => transactions.filter(t => t.type === 'receita'), [transactions])
  const desps = useMemo(() => transactions.filter(t => t.type === 'despesa'), [transactions])
  const totR  = useMemo(() => recs.reduce((s, t) => s + t.amount, 0), [recs])
  const totD  = useMemo(() => desps.reduce((s, t) => s + t.amount, 0), [desps])
  const saldo = totR - totD

  const catEntries = useMemo(() => {
    const map: Record<string, number> = {}
    desps.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [desps])

  const handleExportPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const mesAno   = `${MONTHS[month]} ${year}`

      const tableRows = (items: Transaction[]) =>
        [...items]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(t => `
            <tr>
              <td>${fmtDate(t.date)}</td>
              <td>${t.description}</td>
              <td>${t.category}</td>
              <td style="text-align:right;font-weight:600">${fmt(t.amount)}</td>
            </tr>
          `).join('')

      const el = document.createElement('div')
      el.style.cssText = 'background:#fff;color:#111;padding:32px;font-family:Segoe UI,sans-serif;width:794px'
      el.innerHTML = `
        <h1 style="font-size:1.4rem;color:#00C39A;border-bottom:2px solid #00C39A;padding-bottom:8px;margin-bottom:16px">
          💰 Planner Financeiro Pro — ${mesAno}
        </h1>
        <p style="font-size:.8rem;color:#64748b;margin-bottom:20px">
          Gerado em ${new Date().toLocaleDateString('pt-BR')} por ${user?.name}
        </p>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:24px">
          <div style="background:#f0fdf4;border-radius:8px;padding:12px;border-left:4px solid #00C39A">
            <div style="font-size:.7rem;color:#666;text-transform:uppercase">Receitas</div>
            <div style="font-size:1.2rem;font-weight:800;color:#00C39A">${fmt(totR)}</div>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:12px;border-left:4px solid #ef4444">
            <div style="font-size:.7rem;color:#666;text-transform:uppercase">Despesas</div>
            <div style="font-size:1.2rem;font-weight:800;color:#dc2626">${fmt(totD)}</div>
          </div>
          <div style="background:#eff6ff;border-radius:8px;padding:12px;border-left:4px solid #3b82f6">
            <div style="font-size:.7rem;color:#666;text-transform:uppercase">Saldo</div>
            <div style="font-size:1.2rem;font-weight:800;color:${saldo >= 0 ? '#00C39A' : '#dc2626'}">${fmt(saldo)}</div>
          </div>
          <div style="background:#fefce8;border-radius:8px;padding:12px;border-left:4px solid #f59e0b">
            <div style="font-size:.7rem;color:#666;text-transform:uppercase">Comprometido</div>
            <div style="font-size:1.2rem;font-weight:800;color:#d97706">${totR > 0 ? (totD / totR * 100).toFixed(1) : 0}%</div>
          </div>
        </div>

        <h2 style="font-size:1rem;color:#00C39A;margin:16px 0 8px">📥 Receitas</h2>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <tr style="background:#00C39A;color:#fff">
            <th style="padding:7px 10px;text-align:left">Data</th>
            <th style="padding:7px 10px;text-align:left">Descrição</th>
            <th style="padding:7px 10px;text-align:left">Categoria</th>
            <th style="padding:7px 10px;text-align:right">Valor</th>
          </tr>
          ${recs.length ? tableRows(recs) : '<tr><td colspan="4" style="text-align:center;padding:8px;color:#999">Nenhuma receita</td></tr>'}
          <tr style="background:#f0fdf4">
            <td colspan="3" style="padding:7px 10px;font-weight:700">Total Receitas</td>
            <td style="text-align:right;padding:7px 10px;font-weight:800;color:#00C39A">${fmt(totR)}</td>
          </tr>
        </table>

        <h2 style="font-size:1rem;color:#ef4444;margin:16px 0 8px">📤 Despesas</h2>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <tr style="background:#ef4444;color:#fff">
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

        <h2 style="font-size:1rem;color:#00C39A;margin:16px 0 8px">🍩 Por Categoria</h2>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <tr style="background:#00C39A;color:#fff">
            <th style="padding:7px 10px;text-align:left">Categoria</th>
            <th style="padding:7px 10px;text-align:right">Total</th>
            <th style="padding:7px 10px;text-align:right">%</th>
          </tr>
          ${catEntries.map(([c, v]) => `
            <tr>
              <td style="padding:6px 10px">${c}</td>
              <td style="text-align:right;padding:6px 10px">${fmt(v)}</td>
              <td style="text-align:right;padding:6px 10px">${totD > 0 ? (v / totD * 100).toFixed(1) : 0}%</td>
            </tr>
          `).join('')}
        </table>

        <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:.72rem;color:#999;text-align:center">
          Planner Financeiro Pro · Exportado em ${new Date().toLocaleString('pt-BR')}
        </div>
      `

      document.body.appendChild(el)
      await html2pdf()
        .set({
          margin:      [10, 10, 10, 10],
          filename:    `planner-${MONTHS[month].toLowerCase()}-${year}.pdf`,
          image:       { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2 },
          jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(el)
        .save()
      document.body.removeChild(el)
      showToast('📄 PDF exportado com sucesso!', 'ok')
    } catch {
      showToast('Erro ao exportar PDF.', 'err')
    }
  }

  return (
    <Card className="bg-[#0F172A]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <CardTitle className="mb-0 text-[#00C39A] flex items-center gap-2">
          <span className="text-xl">📄</span>
          Relatório — {MONTHS[month]} {year}
        </CardTitle>
        <Button 
          onClick={handleExportPDF}
          className="bg-gradient-to-r from-[#00C39A] to-[#00A383] hover:from-[#00D4A8] hover:to-[#00C39A] text-white font-semibold"
        >
          ⬇ Exportar PDF
        </Button>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { l: '📥 Receitas',     v: fmt(totR),  c: 'text-[#00C39A]', bg: 'bg-[#00C39A]/10', border: 'border-[#00C39A]/20' },
              { l: '📤 Despesas',     v: fmt(totD),  c: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
              { l: '💳 Saldo',        v: fmt(saldo), c: saldo >= 0 ? 'text-[#00C39A]' : 'text-red-400', bg: saldo >= 0 ? 'bg-[#00C39A]/10' : 'bg-red-500/10', border: saldo >= 0 ? 'border-[#00C39A]/20' : 'border-red-500/20' },
              { l: '📊 Comprometido', v: `${totR > 0 ? (totD / totR * 100).toFixed(1) : 0}%`, c: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            ].map(({ l, v, c, bg, border }) => (
              <div key={l} className={`${bg} ${border} border rounded-xl p-4`}>
                <div className="text-xs text-slate-400 mb-1">{l}</div>
                <div className={`text-xl font-black ${c}`}>{v}</div>
              </div>
            ))}
          </div>

          {/* Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {[
              { title: '📥 Receitas', items: recs,  borderColor: 'border-l-[#00C39A]', amtCls: 'text-[#00C39A]' },
              { title: '📤 Despesas', items: desps, borderColor: 'border-l-red-500',   amtCls: 'text-red-400'   },
            ].map(({ title, items, borderColor, amtCls }) => (
              <div key={title}>
                <p className={`font-bold text-sm mb-3 ${amtCls}`}>{title}</p>
                {items.length === 0
                  ? <EmptyState message="Nenhum lançamento." />
                  : [...items].sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                    <div key={t.id} className={`flex justify-between items-center bg-[#0B1120] rounded-xl px-4 py-3 mb-2 border-l-4 ${borderColor} border border-white/5`}>
                      <div>
                        <div className="text-sm font-semibold text-white">{t.description}</div>
                        <div className="text-xs text-slate-500">{t.category} · {fmtDate(t.date)}</div>
                      </div>
                      <span className={`font-black text-sm ${amtCls}`}>{fmt(t.amount)}</span>
                    </div>
                  ))
                }
              </div>
            ))}
          </div>

          {/* Categories */}
          <div>
            <p className="font-bold text-sm text-[#00C39A] mb-4">🍩 Despesas por Categoria</p>
            {catEntries.length === 0
              ? <EmptyState message="Sem despesas este mês." />
              : catEntries.map(([c, v]) => (
                <div key={c} className="mb-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span className="text-white font-medium">{c}</span>
                    <span>{fmt(v)} <span className="text-slate-500">({totD > 0 ? (v / totD * 100).toFixed(1) : 0}%)</span></span>
                  </div>
                  <div className="bg-[#1E293B] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(v / catEntries[0][1] * 100).toFixed(1)}%`, background: CATEGORY_COLORS[c] || '#00C39A' }}
                    />
                  </div>
                </div>
              ))
            }
          </div>
        </>
      )}
    </Card>
  )
}
