import 'dotenv/config'
import express from 'express'
import cors    from 'cors'
import helmet  from 'helmet'
import authRoutes        from './routes/auth.routes'
import transactionRoutes from './routes/transaction.routes'
import goalRoutes        from './routes/goal.routes'
import budgetRoutes      from './routes/budget.routes'
import cardRoutes        from './routes/card.routes'
import settingsRoutes from './routes/settings.routes';

const app  = express()
const PORT = process.env.PORT || 3333

app.use(helmet())
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '5mb' }))

// Rotas
app.use('/api/auth',         authRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/goals',        goalRoutes)
app.use('/api/budgets',      budgetRoutes)   
app.use('/api/cards',        cardRoutes) 
app.use('/api/settings', settingsRoutes);    

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }))

app.listen(PORT, () => {
  console.log(`\n🚀 Backend rodando em http://localhost:${PORT}`)
  console.log(`📋 Health: http://localhost:${PORT}/health\n`)
})
