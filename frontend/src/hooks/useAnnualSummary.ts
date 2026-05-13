import { useState, useCallback } from 'react'
import { api } from '@/api/client'
import { MonthlySummary } from '@/types'

export function useAnnualSummary() {
  const [annualData, setAnnualData] = useState<MonthlySummary[]>([])
  const [loading,    setLoading]    = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/transactions/summary')
      setAnnualData(data)
    } finally {
      setLoading(false)
    }
  }, [])

  return { annualData, loading, load }
}