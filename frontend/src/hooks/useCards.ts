import { useState, useCallback } from 'react'
import { api } from '@/api/client'
import { Budget } from '@/types'

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (yearMonthStr: string) => {
    setLoading(true)
    try {
      const { data } = await api.get('/budgets', { params: { month: yearMonthStr } })
      setBudgets(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const upsert = useCallback(async (category: string, limit: number, month: string) => {
    await api.post('/budgets', { category, limit, month })
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/budgets/${id}`)
  }, [])

  return { budgets, loading, load, upsert, remove }
}