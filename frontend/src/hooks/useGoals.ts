import { useState, useCallback } from 'react'
import { api } from '@/api/client'
import { Goal } from '@/types'

export function useGoals() {
  const [goals,   setGoals]   = useState<Goal[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/goals')
      setGoals(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (payload: object) => {
    await api.post('/goals', payload)
  }, [])

  const contribute = useCallback(async (id: string, amount: number) => {
    await api.patch(`/goals/${id}/contribution`, { amount })
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/goals/${id}`)
  }, [])

  return { goals, loading, load, create, contribute, remove }
}