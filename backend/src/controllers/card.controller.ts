import { Response } from 'express'
import { prisma }   from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

// ── helpers ────────────────────────────────────────────────────────────────

/** Calcula o mês de fatura dado o dia de fechamento e a data da compra */
function resolveInvoiceMonth(purchaseDate: string, closingDay: number): string {
  const [y, m, d] = purchaseDate.split('-').map(Number)
  if (d > closingDay) {
    const next = new Date(y, m, 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

/** Recalcula o total de uma fatura somando as transações vinculadas */
async function recalcInvoice(cardId: string, month: string): Promise<number> {
  const rows = await prisma.transaction.findMany({
    where:  { cardId, invoiceMonth: month, type: 'despesa' },
    select: { amount: true },
  })
  const total = rows.reduce((s, r) => s + r.amount, 0)

  await prisma.cardInvoice.upsert({
    where:  { cardId_month: { cardId, month } },
    update: { total },
    create: { cardId, month, total },
  })
  return total
}

// ── CRUD Cartões ───────────────────────────────────────────────────────────

export async function listCards(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!
    const cards  = await prisma.creditCard.findMany({
      where:   { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        invoices: {
          orderBy: { month: 'desc' },
          take:    3,
        },
      },
    })
    res.json(cards)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar cartões.' })
  }
}

export async function createCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!
    const {
      name,
      lastDigits,
      limit,
      closingDay,
      dueDay,
      color,
      icon,
    } = req.body

    if (!name || !limit || !closingDay || !dueDay) {
      res.status(400).json({ error: 'Campos obrigatórios faltando.' })
      return
    }

    const card = await prisma.creditCard.create({
      data: {
        userId,
        name:       String(name),
        lastDigits: lastDigits ? String(lastDigits) : null,
        limit:      parseFloat(String(limit)),
        closingDay: parseInt(String(closingDay), 10),
        dueDay:     parseInt(String(dueDay), 10),
        color:      color ? String(color) : '#3b82f6',
        icon:       icon  ? String(icon)  : '💳',
      },
    })
    res.status(201).json(card)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar cartão.' })
  }
}

export async function updateCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id     = req.params.id as string   // ✅ cast explícito
    const userId = req.userId!
    const {
      name,
      lastDigits,
      limit,
      closingDay,
      dueDay,
      color,
      icon,
    } = req.body

    const card = await prisma.creditCard.findFirst({ where: { id, userId } })
    if (!card) {
      res.status(404).json({ error: 'Cartão não encontrado.' })
      return
    }

    const updated = await prisma.creditCard.update({
      where: { id },
      data: {
        ...(name       !== undefined && { name:       String(name) }),
        ...(lastDigits !== undefined && { lastDigits: lastDigits ? String(lastDigits) : null }),
        ...(limit      !== undefined && { limit:      parseFloat(String(limit)) }),
        ...(closingDay !== undefined && { closingDay: parseInt(String(closingDay), 10) }),
        ...(dueDay     !== undefined && { dueDay:     parseInt(String(dueDay), 10) }),
        ...(color      !== undefined && { color:      String(color) }),
        ...(icon       !== undefined && { icon:       String(icon) }),
      },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar cartão.' })
  }
}

export async function deleteCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id     = req.params.id as string   // ✅ cast explícito
    const userId = req.userId!

    const card = await prisma.creditCard.findFirst({ where: { id, userId } })
    if (!card) {
      res.status(404).json({ error: 'Cartão não encontrado.' })
      return
    }

    await prisma.creditCard.delete({ where: { id } })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao remover cartão.' })
  }
}

// ── Lançamentos no cartão ──────────────────────────────────────────────────

export async function addCardTransaction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId  = req.userId!
    const cardId  = req.params.cardId as string   // ✅ cast explícito
    const {
      description,
      amount,
      category,
      date,
      note,
    } = req.body

    if (!description || !amount || !category || !date) {
      res.status(400).json({ error: 'Campos obrigatórios faltando.' })
      return
    }

    const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } })
    if (!card) {
      res.status(404).json({ error: 'Cartão não encontrado.' })
      return
    }

    const invoiceMonth = resolveInvoiceMonth(String(date), card.closingDay)

    const tx = await prisma.transaction.create({
      data: {
        userId,
        type:        'despesa',
        description: String(description),
        amount:      parseFloat(String(amount)),
        category:    String(category),
        date:        String(date),
        invoiceMonth,
        source:      'manual',
        note:        note ? String(note) : null,
        card: {
          connect: { id: cardId },   // ✅ connect — 100% type-safe
        },
      },
    })

    await recalcInvoice(cardId, invoiceMonth)

    res.status(201).json({ ...tx, invoiceMonth })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao lançar no cartão.' })
  }
}

// ── Faturas ────────────────────────────────────────────────────────────────

export async function listInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!
    const cardId = req.params.cardId as string   // ✅ cast explícito

    const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } })
    if (!card) {
      res.status(404).json({ error: 'Cartão não encontrado.' })
      return
    }

    const invoices = await prisma.cardInvoice.findMany({
      where:   { cardId },
      orderBy: { month: 'desc' },
      take:    12,
    })

    const result = await Promise.all(
      invoices.map(async inv => {
        const transactions = await prisma.transaction.findMany({
          where:   { cardId, invoiceMonth: inv.month },
          orderBy: { date: 'desc' },
        })
        return { ...inv, transactions }
      })
    )

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar faturas.' })
  }
}

export async function getInvoiceByMonth(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId  = req.userId!
    const cardId  = req.params.cardId as string   // ✅ cast explícito
    const month   = req.params.month  as string   // ✅ cast explícito

    const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } })
    if (!card) {
      res.status(404).json({ error: 'Cartão não encontrado.' })
      return
    }

    const transactions = await prisma.transaction.findMany({
      where:   { cardId, invoiceMonth: month },
      orderBy: { date: 'desc' },
    })

    let invoice = await prisma.cardInvoice.findUnique({
      where: { cardId_month: { cardId, month } },
    })

    if (!invoice && transactions.length > 0) {
      const total = transactions.reduce((s, t) => s + t.amount, 0)
      invoice = await prisma.cardInvoice.create({
        data: { cardId, month, total },
      })
    }

    res.json({ invoice, transactions, card })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar fatura.' })
  }
}

export async function payInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId  = req.userId!
    const cardId  = req.params.cardId as string   // ✅ cast explícito
    const month   = req.params.month  as string   // ✅ cast explícito

    const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } })
    if (!card) {
      res.status(404).json({ error: 'Cartão não encontrado.' })
      return
    }

    const invoice = await prisma.cardInvoice.findUnique({
      where: { cardId_month: { cardId, month } },
    })
    if (!invoice) {
      res.status(404).json({ error: 'Fatura não encontrada.' })
      return
    }

    const updated = await prisma.cardInvoice.update({
      where: { cardId_month: { cardId, month } },
      data:  { paid: true, paidAt: new Date() },
    })

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao pagar fatura.' })
  }
}
