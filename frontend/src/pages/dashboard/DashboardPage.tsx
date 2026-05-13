import { useState, useEffect } from 'react'
import { DashboardLayout }   from '@/layouts/DashboardLayout'
import { Toast }             from '@/components/ui'
import { useToast }          from '@/hooks/useToast'
import { useMonth }          from '@/hooks/useMonth'
import { PageId }            from '@/constants'

import { OverviewPage }      from './dashboard/OverviewPage'
import { TransactionsPage }  from './dashboard/TransactionsPage'
import { BudgetPage }        from './dashboard/BudgetPage'
import { CardsPage }         from './dashboard/CardsPage'
import { GoalsPage }         from './dashboard/GoalsPage'
import { ImportPage }        from './dashboard/ImportPage'
import { ReportPage }        from './dashboard/ReportPage'
import { SettingsPage }      from './dashboard/SettingsPage'

export default function DashboardPage() {
  const [page, setPage]     = useState<PageId>('overview')
  const { toast, showToast } = useToast()
  const { month, year, navigate, yearMonthStr } = useMonth()

  // Scroll to top on page change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [page])

  const commonProps = { showToast, month, year, yearMonthStr }

  return (
    <DashboardLayout
      currentPage={page}
      onPageChange={setPage}
      month={month}
      year={year}
      onMonthChange={navigate}
    >
      {page === 'overview'     && <OverviewPage     {...commonProps} onNavigate={setPage} />}
      {page === 'transactions' && <TransactionsPage {...commonProps} />}
      {page === 'budget'       && <BudgetPage       {...commonProps} />}
      {page === 'cards'        && <CardsPage        {...commonProps} />}
      {page === 'goals'        && <GoalsPage        {...commonProps} />}
      {page === 'import'       && <ImportPage       {...commonProps} />}
      {page === 'report'       && <ReportPage       {...commonProps} />}
      {page === 'settings'     && <SettingsPage     showToast={showToast} />}

      <Toast {...toast} />
    </DashboardLayout>
  )
}