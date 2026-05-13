import { todayStr } from './utils'

export interface ImportRow {
  desc:  string
  valor: number
  tipo:  'receita' | 'despesa'
  data:  string
  cat:   string
}

export function parseOFX(content: string): ImportRow[] {
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

    let dateStr = todayStr()
    if (dtRaw.length >= 8) {
      dateStr = `${dtRaw.slice(0, 4)}-${dtRaw.slice(4, 6)}-${dtRaw.slice(6, 8)}`
    }

    rows.push({
      desc:  memo,
      valor: Math.abs(amount),
      tipo:  amount >= 0 ? 'receita' : 'despesa',
      data:  dateStr,
      cat:   'Outros',
    })
  }

  return rows
}

export function parseCSV(content: string): ImportRow[] {
  const rows: ImportRow[] = []
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return rows

  const sep     = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].toLowerCase().split(sep).map(h => h.replace(/"/g, '').trim())

  const idx = {
    date: headers.findIndex(h => ['data', 'date', 'dt'].includes(h)),
    desc: headers.findIndex(h =>
      ['descricao', 'descrição', 'description', 'memo',
       'historico', 'histórico', 'nome', 'name'].includes(h)
    ),
    val:  headers.findIndex(h =>
      ['valor', 'value', 'amount', 'vlr', 'montante'].includes(h)
    ),
  }

  if (idx.date === -1 || idx.desc === -1 || idx.val === -1) return rows

  lines.slice(1).forEach(line => {
    const cols  = line.split(sep).map(c => c.replace(/"/g, '').trim())
    const rawV  = cols[idx.val]?.replace('.', '').replace(',', '.')
    const valor = parseFloat(rawV)
    const desc  = cols[idx.desc]

    if (!desc || isNaN(valor)) return

    const raw = cols[idx.date]
    let dateStr = todayStr()

    if (raw?.includes('/')) {
      const [d, m, y] = raw.split('/')
      if (y?.length === 4)
        dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
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
