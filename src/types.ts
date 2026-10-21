// ============================================================================
// Tipos centrais da Caderneta Financeira
// ============================================================================

/** Direção de uma transação: entrada (crédito) ou saída (débito). */
export type TransactionType = 'entrada' | 'saida'

/** Classificação manual do usuário para uma transação. */
export type TransactionStatus = 'essencial' | 'superflua' | 'ignorar'

/**
 * Uma transação normalizada, pronta para ser exibida e agregada.
 * O campo `amount` é sempre um número POSITIVO; a direção fica em `type`.
 */
export interface Transaction {
  id: string
  /** Data no formato ISO `yyyy-mm-dd`. */
  date: string
  /** Descrição original, como veio do extrato. */
  description: string
  /** Nome do estabelecimento já normalizado (ex.: "Uber"). */
  merchant: string
  /** Valor absoluto, em reais. */
  amount: number
  type: TransactionType
  /** id da categoria (ver config/categories.ts). */
  category: string
  /** Referência ao extrato de origem. */
  statementId: string
  /** Banco de origem (ex.: "Nubank"). */
  bank?: string
  status?: TransactionStatus
  tags: string[]
  note?: string
}

/** Uma transação ainda crua, recém-extraída do arquivo (antes de revisar). */
export interface RawTransaction {
  date: string
  description: string
  amount: number
  type: TransactionType
}

/** Um extrato importado. */
export interface Statement {
  id: string
  /** Rótulo amigável, ex.: "Outubro 2026 — Nubank". */
  label: string
  bank: string
  /** Período no formato `yyyy-mm`. */
  period: string
  importedAt: string
  transactionCount: number
  fileName?: string
}

/** Regra aprendida: "toda descrição que contém `pattern` vira `categoryId`". */
export interface LearnedRule {
  id: string
  /** Substring (já normalizada) ou regex simples. */
  pattern: string
  categoryId: string
  createdAt: string
}

/** Categoria, com termos para classificação automática. */
export interface Category {
  id: string
  name: string
  /** Cor usada nos gráficos e marcadores. */
  color: string
  /** Termos (em minúsculo, sem acento) que casam com esta categoria. */
  keywords: string[]
  /** Orçamento mensal opcional (0 = sem limite). */
  budget?: number
}

/** Orçamentos definidos pelo usuário por categoria. */
export type BudgetMap = Record<string, number>
