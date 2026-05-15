import { useState } from 'react'
import { Card, CardTitle, Button, Select, EmptyState } from '@/components/ui'
import { useTransactions }  from '@/hooks/useTransactions'
import { useAnnualSummary } from '@/hooks/useAnnualSummary'
import { fmt, fmtDate }     from '@/lib/utils'
import { CATS }             from '@/constants'
import { ToastType }        from '@/hooks/useToast'

interface Props {
  month: number
  year: number
  yearMonthStr: string
  showToast: (msg: string, type?: ToastType) => void
}

interface ImportRow {
  desc:  string
  valor: number
  tipo:  'receita' | 'despesa'
  data:  string
  cat:   string
}

// ── Parsers ────────────────────────────────────────────────────────────
function parseOFX(content: string): ImportRow[] {
  const rows: ImportRow[] = []
  const stmtRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
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

    let dateStr = new Date().toISOString().split('T')[0]
    if (dtRaw.length >= 8) {
      dateStr = `${dtRaw.slice(0, 4)}-${dtRaw.slice(4, 6)}-${dtRaw.slice(6, 8)}`
    }
    rows.push({
      desc:  memo.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      valor: Math.abs(amount),
      tipo:  amount >= 0 ? 'receita' : 'despesa',
      data:  dateStr,
      cat:   'Outros',
    })
  }
  return rows
}

function parseCSV(content: string): ImportRow[] {
  const rows: ImportRow[] = []
  const lines  = content.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return rows
  const sep     = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].toLowerCase().split(sep).map(h => h.replace(/"/g, '').trim())
  const iDate   = headers.findIndex(h => ['data', 'date', 'dt'].includes(h))
  const iDesc   = headers.findIndex(h => ['descricao', 'descrição', 'description', 'memo', 'historico', 'histórico', 'nome', 'name'].includes(h))
  const iVal    = headers.findIndex(h => ['valor', 'value', 'amount', 'vlr', 'montante'].includes(h))
  if (iDate === -1 || iDesc === -1 || iVal === -1) return rows

  lines.slice(1).forEach(line => {
    const cols   = line.split(sep).map(c => c.replace(/"/g, '').trim())
    const rawVal = cols[iVal]?.replace('.', '').replace(',', '.')
    const valor  = parseFloat(rawVal)
    const desc   = cols[iDesc]
    if (!desc || isNaN(valor)) return

    const raw = cols[iDate]
    let dateStr = new Date().toISOString().split('T')[0]
    if (raw?.includes('/')) {
      const [d, m, y] = raw.split('/')
      if (y?.length === 4) dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    } else if (raw?.includes('-')) {
      dateStr = raw
    }
    rows.push({ desc, valor: Math.abs(valor), tipo: valor >= 0 ? 'receita' : 'despesa', data: dateStr, cat: 'Outros' })
  })
  return rows
}

// ── Component ─────────────────────────────────────────────────────────
export function ImportPage({ month, year, showToast }: Props) {
  const { bulkCreate, load: loadTx } = useTransactions()
  const { load: loadSummary }        = useAnnualSummary()

  const now = new Date()
  const [invoiceMonth, setInvoiceMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  )
  const [rows,     setRows]     = useState<ImportRow[]>([])
  const [checked,  setChecked]  = useState<boolean[]>([])
  const [cats,     setCats]     = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  const handleFile = (file: File) => {
    const ext    = file.name.split('.').pop()?.toLowerCase()
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      let parsed: ImportRow[] = []
      if      (ext === 'ofx' || ext === 'qfx') parsed = parseOFX(content)
      else if (ext === 'csv')                   parsed = parseCSV(content)
      else { showToast('Formato não suportado. Use .ofx, .qfx ou .csv', 'err'); return }

      if (!parsed.length) {
        showToast('Nenhuma transação encontrada no arquivo.', 'err')
        return
      }
      setRows(parsed)
      setChecked(parsed.map(() => true))
      setCats(parsed.map(r => r.cat))
      showToast(`📥 ${parsed.length} transações encontradas!`, 'ok')
    }
    reader.readAsText(file, 'latin1')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const toggleAll = (state: boolean) => setChecked(rows.map(() => state))

  const handleImport = async () => {
    const toImport = rows
      .map((r, i) => ({ ...r, _checked: checked[i], cat: cats[i] ?? 'Outros' }))
      .filter(r => r._checked)
      .map(({ _checked, ...r }) => r)

    if (!toImport.length)  return showToast('Selecione ao menos uma transação.', 'err')
    if (!invoiceMonth)     return showToast('Selecione o mês da fatura!', 'err')

    setImporting(true)
    try {
      const result = await bulkCreate(toImport, invoiceMonth)
      showToast(`✅ ${result.count} transações importadas!`, 'ok')
      setRows([])
      setChecked([])
      setCats([])
      await loadTx(year, month, 1)
      await loadSummary()
    } catch {
      showToast('Erro ao importar.', 'err')
    } finally {
      setImporting(false)
    }
  }

  const cancel = () => { setRows([]); setChecked([]); setCats([]) }

  const selectedCount = checked.filter(Boolean).length

  return (
    <>
      <Card className="bg-[#0F172A]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <CardTitle className="text-[#00C39A] flex items-center gap-2 mb-5">
          <span className="text-xl">📥</span>
          Importar Fatura / Extrato
        </CardTitle>

        {/* Supported formats info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[
            {
              title: '📄 Formato OFX / QFX',
              desc: 'Exportado pelos principais bancos brasileiros (Itaú, Bradesco, Nubank, etc). Contém data, valor e descrição de cada transação.',
              icon: '📄',
            },
            {
              title: '📊 Formato CSV',
              desc: 'Planilha separada por ponto-e-vírgula ou vírgula. Colunas esperadas: Data; Descrição; Valor',
              icon: '📊',
            },
          ].map(({ title, desc }) => (
            <div key={title} className="bg-[#0B1120] rounded-xl p-4 border border-white/5 hover:border-[#00C39A]/20 transition-colors">
              <p className="font-bold text-sm mb-2 text-white">{title}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Invoice month */}
        <div className="mb-6 p-4 rounded-xl border border-[#00C39A]/20 bg-[#00C39A]/5">
          <label className="block text-xs text-[#00C39A] font-semibold uppercase tracking-wide mb-2">
            📅 Mês de referência da fatura
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              type="month"
              value={invoiceMonth}
              onChange={e => setInvoiceMonth(e.target.value)}
              className="rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-700 focus:border-[#00C39A] transition-colors bg-[#0B1120] text-slate-200"
            />
            <p className="text-xs text-slate-400">
              Todas as transações importadas serão agrupadas neste mês.
            </p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center cursor-pointer hover:border-[#00C39A] hover:bg-[#00C39A]/5 transition-all duration-300 group"
          onClick={() => document.getElementById('file-input-import')?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📂</div>
          <p className="font-bold mb-2 text-white">Clique ou arraste o arquivo aqui</p>
          <p className="text-sm text-slate-400">Suporta .ofx, .qfx, .csv — processado localmente</p>
          <input
            id="file-input-import"
            type="file"
            accept=".ofx,.qfx,.csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
      </Card>

      {/* Preview */}
      {rows.length > 0 && (
        <Card className="bg-[#0F172A]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <CardTitle className="mb-0 text-[#00C39A] flex items-center gap-2">
              <span>👁</span> Preview — {rows.length} transações
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleAll(true)}
                className="border-slate-700 hover:border-[#00C39A] hover:text-[#00C39A]"
              >
                ✅ Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleAll(false)}
                className="border-slate-700 hover:border-slate-500"
              >
                ⬜ Nenhum
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto mb-4 pr-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#0B1120] rounded-xl px-4 py-3 border border-white/5 hover:border-[#00C39A]/20 transition-colors">
                <input
                  type="checkbox"
                  checked={checked[i] || false}
                  onChange={e => {
                    const next = [...checked]
                    next[i] = e.target.checked
                    setChecked(next)
                  }}
                  className="w-4 h-4 accent-[#00C39A] flex-shrink-0 rounded"
                />
                <span className="flex-1 text-sm truncate text-white">{r.desc}</span>
                <span className="text-xs text-slate-500 min-w-[70px] text-center">{fmtDate(r.data)}</span>
                <span className={`font-bold text-sm min-w-[90px] text-right ${r.tipo === 'receita' ? 'text-[#00C39A]' : 'text-red-400'}`}>
                  {r.tipo === 'receita' ? '+' : '-'} {fmt(r.valor)}
                </span>
                <select
                  value={cats[i] || 'Outros'}
                  onChange={e => {
                    const next = [...cats]
                    next[i] = e.target.value
                    setCats(next)
                  }}
                  className="rounded-lg px-2 py-1.5 text-xs outline-none border border-slate-700 focus:border-[#00C39A] bg-[#0B1120] text-slate-200 transition-colors"
                >
                  {CATS[r.tipo].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-3 items-center flex-wrap pt-4 border-t border-white/5">
            <Button 
              onClick={handleImport} 
              loading={importing} 
              className="bg-gradient-to-r from-[#00C39A] to-[#00A383] hover:from-[#00D4A8] hover:to-[#00C39A] text-white font-semibold"
            >
              ✔ Importar {selectedCount} selecionados
            </Button>
            <Button onClick={cancel} variant="outline" className="border-slate-700 hover:border-red-500 hover:text-red-400">
              ✖ Cancelar
            </Button>
            <span className="text-xs text-slate-500">
              <span className="text-[#00C39A] font-semibold">{selectedCount}</span> de {rows.length} selecionados
            </span>
          </div>
        </Card>
      )}
    </>
  )
}
