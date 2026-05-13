import { useState, useCallback } from 'react'
import { api } from '@/api/client'
import { Transaction, Pagination } from '@/types'

const DEFAULT_PAGINATION: Pagination = { total: 0, page: 1, totalPages: 1, limit: 20 }

export function useTransactions() {
  const [transactions, setTransactions]   = useState<Transaction[]>([])
  const [pagination,   setPagination]     = useState<Pagination>(DEFAULT_PAGINATION)
  const [currentPage,  setCurrentPage]    = useState(1)
  const [loading,      setLoading]        = useState(false)

  const load = useCallback(async (year: number, month: number, page = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/transactions', {
        params: { year, month: month + 1, page, limit: 20 },
      })
      setTransactions(data.data)
      setPagination({ total: data.total, page: data.page, totalPages: data.totalPages, limit: data.limit })
      setCurrentPage(page)
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (payload: object) => {
    await api.post('/transactions', payload)
  }, [])

  const update = useCallback(async (id: string, payload: object) => {
    await api.put(`/transactions/${id}`, payload)
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/transactions/${id}`)
  }, [])

  const bulkCreate = useCallback(async (transactions: object[], invoiceMonth: string) => {
    const { data } = await api.post('/transactions/bulk', { transactions, invoiceMonth })
    return data as { count: number }
  }, [])

  return {
    transactions,
    pagination,
    currentPage,
    loading,
    load,
    create,
    update,
    remove,
    bulkCreate,
  }
}