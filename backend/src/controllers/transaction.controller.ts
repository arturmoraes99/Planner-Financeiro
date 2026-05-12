import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildDateWhere(userId: string, year?: string, month?: string) {
  const where: any = { userId }

  if (year && month) {
    const y         = String(year)
    const m         = String(month).padStart(2, '0')
    const yearMonth = `${y}-${m}`

    where.OR = [
      { source: 'invoice_import', invoiceMonth: yearMonth },
      {
        source: 'manual',
        date: { gte: `${yearMonth}-01`, lte: `${yearMonth}-31` },
      },
    ]
  }

  return where
}

// ─── Controllers ────────────────────────────────────────────────────────────

export async function list(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { year, month, page = '1', limit = '50' } = req.query
    const userId  = req.userId!
    const take    = Math.min(parseInt(limit as string) || 50, 100)
    const skip    = (parseInt(page as string) - 1) * take

    const where = buildDateWhere(
      userId,
      year  as string | undefined,
      month as string | undefined
    )

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take,
        skip,
      }),
      prisma.transaction.count({ where }),
    ])

    res.json({
      data:       transactions,
      total,
      page:       parseInt(page as string),
      totalPages: Math.ceil(total / take),
      limit:      take,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar transações.' })
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type, description, amount, category, date, note } = req.body
    const userId = req.userId!

    if (!type || !description || !amount || !category || !date) {
      res.status(400).json({ error: 'Campos obrigatórios faltando.' })
      return
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type,
        description,
        amount:   parseFloat(amount),
        category,
        date,
        source:   'manual',
        note:     note || null,
      },
    })

    res.status(201).json(transaction)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar transação.' })
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id }     = req.params
    const userId     = req.userId!
    const { type, description, amount, category, date, note } = req.body

    const existing = await prisma.transaction.findFirst({ where: { id, userId } })
    if (!existing) {
      res.status(404).json({ error: 'Transação não encontrada.' })
      return
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(type        && { type }),
        ...(description && { description }),
        ...(amount      && { amount: parseFloat(amount) }),
        ...(category    && { category }),
        ...(date        && { date }),
        note: note ?? existing.note,
      },
    })

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar transação.' })
  }
}

export async function bulkCreate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { transactions, invoiceMonth } = req.body
    const userId  = req.userId!

    if (!Array.isArray(transactions) || transactions.length === 0) {
      res.status(400).json({ error: 'Lista de transações inválida.' })
      return
    }

    const isInvoice = !!invoiceMonth
    const source    = isInvoice ? 'invoice_import' : 'manual'

    const data = transactions.map((t: any) => ({
      userId,
      type:         t.tipo       || t.type,
      description:  t.desc       || t.description,
      amount:       parseFloat(t.valor || t.amount),
      category:     t.cat        || t.category || 'Outros',
      date:         t.data       || t.date,
      note:         t.obs        || t.note     || null,
      source,
      invoiceMonth: isInvoice ? invoiceMonth : null,
    }))

    const result = await prisma.transaction.createMany({ data })

    res.status(201).json({ count: result.count, invoiceMonth: invoiceMonth || null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao importar transações.' })
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id }  = req.params
    const userId  = req.userId!

    const transaction = await prisma.transaction.findFirst({ where: { id, userId } })
    if (!transaction) {
      res.status(404).json({ error: 'Transação não encontrada.' })
      return
    }

    await prisma.transaction.delete({ where: { id } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover transação.' })
  }
}

export async function summary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!
    const months = []
    const now    = new Date()

    for (let i = 11; i >= 0; i--) {
      const d         = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y         = d.getFullYear()
      const m         = String(d.getMonth() + 1).padStart(2, '0')
      const yearMonth = `${y}-${m}`

      const rows = await prisma.transaction.findMany({
        where: {
          userId,
          OR: [
            { source: 'invoice_import', invoiceMonth: yearMonth },
            { source: 'manual', date: { gte: `${yearMonth}-01`, lte: `${yearMonth}-31` } },
          ],
        },
        select: { type: true, amount: true },
      })

      const receitas = rows.filter(r => r.type === 'receita').reduce((s, r) => s + r.amount, 0)
      const despesas = rows.filter(r => r.type === 'despesa').reduce((s, r) => s + r.amount, 0)

      months.push({
        label:    `${m}/${y}`,
        month:    d.getMonth(),
        year:     y,
        receitas,
        despesas,
        saldo:    receitas - despesas,
      })
    }

    res.json(months)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar resumo.' })
  }
}
