export const CATS = {
  receita: [
    'Salário', 'Freelance', '13º / Férias', 'Aluguel Recebido',
    'Investimentos', 'Presente', 'Reembolso', 'Outros',
  ],
  despesa: [
    'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação',
    'Lazer', 'Assinaturas', 'Roupas', 'Eletrônicos', 'Viagem',
    'Cartão de Crédito', 'Outros',
  ],
} as const

export const CATEGORY_COLORS: Record<string, string> = {
  Moradia:           '#3b82f6',
  Alimentação:       '#f59e0b',
  Transporte:        '#8b5cf6',
  Saúde:             '#ef4444',
  Educação:          '#06b6d4',
  Lazer:             '#f97316',
  Assinaturas:       '#ec4899',
  Roupas:            '#a78bfa',
  Eletrônicos:       '#67e8f9',
  Viagem:            '#34d399',
  'Cartão de Crédito': '#fb7185',
  Outros:            '#64748b',
  Salário:           '#22c55e',
  Freelance:         '#4ade80',
  '13º / Férias':    '#86efac',
  'Aluguel Recebido': '#6ee7b7',
  Investimentos:     '#34d399',
  Presente:          '#a7f3d0',
  Reembolso:         '#d1fae5',
}

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const CARD_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#22c55e', '#06b6d4', '#f97316', '#64748b', '#1e3a5f',
]

export const CARD_ICONS = [
  '💳', '🔵', '🟣', '⚫', '🥇', '💎', '🌟', '🦁', '🐉', '🚀',
]

export const NAV_ITEMS = [
  { id: 'overview',      label: 'Dashboard',   icon: '📊' },
  { id: 'transactions',  label: 'Lançamentos', icon: '💳' },
  { id: 'budget',        label: 'Orçamento',   icon: '🎚️' },
  { id: 'cards',         label: 'Cartões',     icon: '🃏' },
  { id: 'goals',         label: 'Metas',       icon: '🎯' },
  { id: 'import',        label: 'Importar',    icon: '📥' },
  { id: 'report',        label: 'Relatório',   icon: '📄' },
  { id: 'settings',      label: 'Configurações', icon: '⚙️' },
] as const

export type PageId = typeof NAV_ITEMS[number]['id']