// src/hooks/useDashboard.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBalance } from './dashboard/useBalance';
import { useRecentTransactions } from './dashboard/useRecentTransactions';
import { useBudgetSummary } from './dashboard/useBudgetSummary';
import { useGoalsSummary } from './dashboard/useGoalsSummary';
import { useCardsSummary } from './dashboard/useCardsSummary';

// ============================================
// TIPOS
// ============================================
export interface DashboardData {
  balance: {
    total: number;
    income: number;
    expenses: number;
  };
  recentTransactions: {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
  }[];
  budgetSummary: {
    totalBudgeted: number;
    totalSpent: number;
    percentUsed: number;
    categories: {
      name: string;
      budgeted: number;
      spent: number;
      percentUsed: number;
    }[];
  };
  goalsSummary: {
    totalGoals: number;
    completedGoals: number;
    totalTargetAmount: number;
    totalSavedAmount: number;
    nearestGoal: {
      name: string;
      targetAmount: number;
      currentAmount: number;
      deadline: string;
    } | null;
  };
  cardsSummary: {
    totalCards: number;
    totalLimit: number;
    totalUsed: number;
    nextInvoice: {
      cardName: string;
      amount: number;
      dueDate: string;
    } | null;
  };
}

interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================
// HOOK PRINCIPAL - COMPOSIÇÃO DOS SUB-HOOKS
// ============================================
export function useDashboard(): UseDashboardReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sub-hooks especializados
  const { balance, isLoading: balanceLoading, error: balanceError, fetchBalance } = useBalance();
  const { transactions, isLoading: transactionsLoading, error: transactionsError, fetchTransactions } = useRecentTransactions();
  const { summary: budgetSummary, isLoading: budgetLoading, error: budgetError, fetchBudgetSummary } = useBudgetSummary();
  const { summary: goalsSummary, isLoading: goalsLoading, error: goalsError, fetchGoalsSummary } = useGoalsSummary();
  const { summary: cardsSummary, isLoading: cardsLoading, error: cardsError, fetchCardsSummary } = useCardsSummary();

  // Estado de loading agregado
  const isLoading = balanceLoading || transactionsLoading || budgetLoading || goalsLoading || cardsLoading || isRefreshing;

  // Primeiro erro encontrado
  const error = balanceError || transactionsError || budgetError || goalsError || cardsError;

  // Dados agregados do dashboard
  const data: DashboardData | null = useMemo(() => {
    if (!balance && !transactions && !budgetSummary && !goalsSummary && !cardsSummary) {
      return null;
    }

    return {
      balance: balance || { total: 0, income: 0, expenses: 0 },
      recentTransactions: transactions || [],
      budgetSummary: budgetSummary || {
        totalBudgeted: 0,
        totalSpent: 0,
        percentUsed: 0,
        categories: [],
      },
      goalsSummary: goalsSummary || {
        totalGoals: 0,
        completedGoals: 0,
        totalTargetAmount: 0,
        totalSavedAmount: 0,
        nearestGoal: null,
      },
      cardsSummary: cardsSummary || {
        totalCards: 0,
        totalLimit: 0,
        totalUsed: 0,
        nextInvoice: null,
      },
    };
  }, [balance, transactions, budgetSummary, goalsSummary, cardsSummary]);

  // Função para atualizar todos os dados
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchBalance(),
        fetchTransactions(),
        fetchBudgetSummary(),
        fetchGoalsSummary(),
        fetchCardsSummary(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchBalance, fetchTransactions, fetchBudgetSummary, fetchGoalsSummary, fetchCardsSummary]);

  // Carrega dados ao montar
  useEffect(() => {
    refresh();
  }, []);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}

export default useDashboard;
