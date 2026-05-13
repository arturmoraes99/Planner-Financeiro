import { useState, useCallback } from 'react'

export function useMonth() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear]   = useState(now.getFullYear())

  const navigate = useCallback((dir: 1 | -1) => {
    setMonth(m => {
      const next = m + dir
      if (next < 0)  { setYear(y => y - 1); return 11 }
      if (next > 11) { setYear(y => y + 1); return 0  }
      return next
    })
  }, [])

  const yearMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  return { month, year, navigate, yearMonthStr }
}