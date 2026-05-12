import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

export async function list(req: AuthRequest, res: Response): Promise<void> {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    })
    res.json(goals)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar metas.' })
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, target, deadline, icon } = req.body
    if (!name || !target) {
      res.status(400).json({ error: 'Nome e valor alvo são obrigatórios.' })
      return
    }
    const goal = await prisma.goal.create({
      data: {
        userId:   req.userId!,
        name,
        target:   parseFloat(target),
        deadline: deadline || null,
        icon:     icon || '🎯',
      },
    })
    res.status(201).json(goal)
  } catch {
    res.status(500).json({ error: 'Erro ao criar meta.' })
  }
}

export async function addContribution(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id }    = req.params
    const { amount } = req.body
    const userId    = req.userId!

    const goal = await prisma.goal.findFirst({ where: { id, userId } })
    if (!goal) { res.status(404).json({ error: 'Meta não encontrada.' }); return }

    const newCurrent = Math.min(goal.current + parseFloat(amount), goal.target)
    const updated = await prisma.goal.update({
      where: { id },
      data:  { current: newCurrent },
    })
    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Erro ao registrar aporte.' })
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const goal   = await prisma.goal.findFirst({ where: { id, userId: req.userId! } })
    if (!goal) { res.status(404).json({ error: 'Meta não encontrada.' }); return }
    await prisma.goal.delete({ where: { id } })
    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'Erro ao remover meta.' })
  }
}
