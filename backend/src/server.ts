import 'dotenv/config'
import express    from 'express'
import cors       from 'cors'
import helmet     from 'helmet'

import authRoutes        from './routes/auth.routes'
import transactionRoutes from './routes/transaction.routes'
import goalRoutes        from './routes/goal.routes'
import budgetRoutes      from './routes/budget.routes'
import cardRoutes        from './routes/card.routes'
import settingsRoutes    from './routes/settings.routes'

const app  = express()
const PORT = process.env.PORT || 3333

// ── Security ────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))

// ── Body parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }))

// ── Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/goals',        goalRoutes)
app.use('/api/budgets',      budgetRoutes)
app.use('/api/cards',        cardRoutes)
app.use('/api/settings',     settingsRoutes)

// ── Health check ────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// ── 404 handler ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' })
})

// ── Global error handler ────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})

app.listen(PORT, () => {
  console.log(`\n🚀 Backend rodando em http://localhost:${PORT}`)
  console.log(`📋 Health: http://localhost:${PORT}/health\n`)
})