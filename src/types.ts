// ============================================================================
// Tipos centrais da Caderneta Financeira
// ============================================================================

/** Direção de uma transação: entrada (crédito) ou saída (débito). */
export type TransactionType = 'entrada' | 'saida'

/** Classificação manual do usuário para uma transação. */
export type TransactionStatus = 'essencial' | 'superflua' | 'ignorar'

/** Informação de parcelamento de uma compra (parcela X de Y). */
export interface InstallmentInfo {
  /** Parcela atual (1..total). */
  current: number
  /** Total de parcelas do plano. */
  total: number
}

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
  /** Preenchido quando a compra é uma parcela de um plano. */
  installment?: InstallmentInfo
  /** Valor na moeda original, quando o banco informou conversão (ex.: 17.14 USD). */
  originalAmount?: number
  /** Moeda original do lançamento (ex.: "USD"). */
  originalCurrency?: string
}

/** Uma transação ainda crua, recém-extraída do arquivo (antes de revisar). */
export interface RawTransaction {
  date: string
  description: string
  amount: number
  type: TransactionType
  /** Estabelecimento já resolvido pelo parser (evita adivinhação). */
  merchant?: string
  /** Texto usado na categorização automática (padrão: `description`). */
  categoryHint?: string
  /** Compra no crédito parcelada (ex.: "Pix no crédito"). */
  creditInstallment?: boolean
  /** Parcela X de Y. */
  installment?: InstallmentInfo
  /** Valor na moeda original, quando o banco informou a conversão. */
  originalAmount?: number
  /** Moeda original do lançamento (ex.: "USD"). */
  originalCurrency?: string
}

/** Parcela que ainda será cobrada em fatura futura ("próxima fatura"). */
export interface PendingInstallment {
  description: string
  current: number
  total: number
  amount: number
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
  /** Parcelas que ainda serão cobradas (vêm da seção "próxima fatura"). */
  pendingInstallments?: PendingInstallment[]
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
