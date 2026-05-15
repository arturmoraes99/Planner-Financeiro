import { useState, useCallback } from 'react'
import { api } from '@/api/client'
import { CreditCard, CardInvoice, Transaction } from '@/types'

export type InvoiceWithTx = CardInvoice & { transactions: Transaction[] }

export function useCards() {
  const [cards,           setCards]           = useState<CreditCard[]>([])
  const [cardInvoices,    setCardInvoices]    = useState<InvoiceWithTx[]>([])
  const [loadingCards,    setLoadingCards]    = useState(false)
  const [loadingInvoices, setLoadingInvoices] = useState(false)

  const loadCards = useCallback(async () => {
    setLoadingCards(true)
    try {
      const { data } = await api.get('/cards')
      setCards(data)
    } finally {
      setLoadingCards(false)
    }
  }, [])

  const loadInvoices = useCallback(async (cardId: string) => {
    setLoadingInvoices(true)
    try {
      const { data } = await api.get(`/cards/${cardId}/invoices`)
      setCardInvoices(data)
    } finally {
      setLoadingInvoices(false)
    }
  }, [])

  const createCard = useCallback(async (payload: object) => {
    const { data } = await api.post('/cards', payload)
    return data as CreditCard
  }, [])

  const updateCard = useCallback(async (id: string, payload: object) => {
    const { data } = await api.put(`/cards/${id}`, payload)
    return data as CreditCard
  }, [])

  const deleteCard = useCallback(async (id: string) => {
    await api.delete(`/cards/${id}`)
  }, [])

  const addCardTransaction = useCallback(async (cardId: string, payload: object) => {
    await api.post(`/cards/${cardId}/transactions`, payload)
  }, [])

  const payInvoice = useCallback(async (cardId: string, month: string) => {
    await api.patch(`/cards/${cardId}/invoices/${month}/pay`, {})
  }, [])

  return {
    cards,
    cardInvoices,
    loadingCards,
    loadingInvoices,
    loadCards,
    loadInvoices,
    createCard,
    updateCard,
    deleteCard,
    addCardTransaction,
    payInvoice,
  }
}