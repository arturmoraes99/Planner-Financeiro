import 'dotenv/config'
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'


export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Preencha todos os campos.' })
      return
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' })
      return
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      res.status(400).json({ error: 'E-mail já cadastrado.' })
      return
    }

    const hashed = await bcrypt.hash(password, 10)
    const user   = await prisma.user.create({
      data: { name, email, password: hashed },
    })

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN as any }
    )

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro interno do servidor.' })
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Preencha e-mail e senha.' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas.' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ error: 'Credenciais inválidas.' })
      return
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN as any }
    )

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro interno do servidor.' })
  }
}

export async function me(req: Request & { userId?: string }, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    })
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado.' }); return }
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' })
  }
}
