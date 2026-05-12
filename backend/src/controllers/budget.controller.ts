import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

export async function listBudgets(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!
    const { month } = req.query // "YYYY-MM"

    const where: any = { userId }
    if (month) where.month = month

    const budgets = await prisma.budget.findMany({ where, orderBy: { category: 'asc' } })
    res.json(budgets)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar orçamentos.' })
  }
}

export async function upsertBudget(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!
    const { category, limit, month } = req.body

    if (!category || !limit || !month) {
      res.status(400).json({ error: 'Campos obrigatórios faltando.' })
      return
    }

    const budget = await prisma.budget.upsert({
      where:  { userId_category_month: { userId, category, month } },
      update: { limit: parseFloat(limit) },
      create: { userId, category, limit: parseFloat(limit), month },
    })

    res.json(budget)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar orçamento.' })
  }
}

export async function removeBudget(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.userId!

    const budget = await prisma.budget.findFirst({ where: { id, userId } })
    if (!budget) {
      res.status(404).json({ error: 'Orçamento não encontrado.' })
      return
    }

    await prisma.budget.delete({ where: { id } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover orçamento.' })
  }
}
