// ============================================================================
// Orçamentos por categoria e por mês
// ----------------------------------------------------------------------------
// O orçamento tem um valor padrão (`base`) e pode ter um valor diferente em
// meses específicos (`months["2026-09"]`). O padrão da categoria (definido em
// config/categories.ts) só é usado quando o usuário nunca definiu nada.
// ============================================================================

import type { BudgetMap, CategoryBudget } from '../types'
import { CATEGORIES, CATEGORY_MAP } from '../config/categories'

/** Categorias que não representam gasto e por isso não entram no total. */
const NON_SPENDING = new Set(['extras', 'renda'])

export function emptyBudget(): CategoryBudget {
  return { months: {} }
}

/**
 * Converte o formato salvo (que já foi um número simples) para o formato atual.
 * Aceita qualquer coisa e devolve sempre um mapa válido — dados antigos ou
 * corrompidos não podem quebrar a página.
 */
export function normalizeBudgetMap(raw: unknown): BudgetMap {
  if (!raw || typeof raw !== 'object') return {}
  const out: BudgetMap = {}

  for (const [categoryId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      // Formato antigo: { transporte: 500 }
      out[categoryId] = { base: value, months: {} }
      continue
    }
    if (!value || typeof value !== 'object') continue

    const obj = value as Partial<CategoryBudget>
    const months: Record<string, number> = {}
    if (obj.months && typeof obj.months === 'object') {
      for (const [period, amount] of Object.entries(obj.months)) {
        if (typeof amount === 'number' && Number.isFinite(amount)) months[period] = amount
      }
    }
    const base =
      typeof obj.base === 'number' && Number.isFinite(obj.base) ? obj.base : undefined
    out[categoryId] = { base, months }
  }

  return out
}

/** Orçamento padrão da categoria (configurado no arquivo de categorias). */
export function defaultBudgetOf(categoryId: string): number {
  return CATEGORY_MAP[categoryId]?.budget ?? 0
}

/** O usuário já definiu um valor padrão para esta categoria? */
export function hasBaseOverride(budgets: BudgetMap, categoryId: string): boolean {
  return budgets[categoryId]?.base !== undefined
}

/** O usuário já definiu um valor próprio para este mês? */
export function hasMonthOverride(
  budgets: BudgetMap,
  categoryId: string,
  period: string,
): boolean {
  return budgets[categoryId]?.months[period] !== undefined
}

/** O usuário já definiu algum valor (padrão ou de um mês) para esta categoria? */
export function hasAnyBudget(budgets: BudgetMap, categoryId: string): boolean {
  const budget = budgets[categoryId]
  return (
    defaultBudgetOf(categoryId) > 0 ||
    budget?.base !== undefined ||
    Object.keys(budget?.months ?? {}).length > 0
  )
}

/** Orçamento padrão efetivo (usuário > configuração). */
export function budgetBase(budgets: BudgetMap, categoryId: string): number {
  return budgets[categoryId]?.base ?? defaultBudgetOf(categoryId)
}

/** Orçamento de um mês específico (`yyyy-mm`), com todos os fallbacks. */
export function budgetForMonth(
  budgets: BudgetMap,
  categoryId: string,
  period: string,
): number {
  const budget = budgets[categoryId]
  if (budget?.months[period] !== undefined) return budget.months[period]
  if (budget?.base !== undefined) return budget.base
  return defaultBudgetOf(categoryId)
}

/** Soma dos orçamentos mensais de um intervalo (usado no período "todos"). */
export function budgetForPeriods(
  budgets: BudgetMap,
  categoryId: string,
  periods: string[],
): number {
  return periods.reduce((acc, period) => acc + budgetForMonth(budgets, categoryId, period), 0)
}

/** Orçamento total (todas as categorias de gasto) para os meses informados. */
export function totalBudgetForPeriods(budgets: BudgetMap, periods: string[]): number {
  return CATEGORIES.filter((c) => !NON_SPENDING.has(c.id)).reduce(
    (acc, c) => acc + budgetForPeriods(budgets, c.id, periods),
    0,
  )
}

export interface PeriodProjection {
  /** O período é o mês corrente? Só nele a projeção faz sentido. */
  isCurrent: boolean
  daysInMonth: number
  elapsedDays: number
  daysLeft: number
  /** Gasto projetado até o fim do mês, no ritmo atual. */
  projection: number
}

/**
 * Projeta o gasto do mês no ritmo atual. Para meses passados devolve o valor
 * gasto (não há o que projetar).
 */
export function projectionForPeriod(
  spent: number,
  period: string,
  now: Date = new Date(),
): PeriodProjection {
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = period.split('-').map(Number)
  const validMonth = Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12
  const daysInMonth = validMonth ? new Date(year, month, 0).getDate() : 30

  if (period !== currentPeriod) {
    return { isCurrent: false, daysInMonth, elapsedDays: daysInMonth, daysLeft: 0, projection: spent }
  }

  const elapsedDays = Math.min(now.getDate(), daysInMonth)
  const daysLeft = Math.max(0, daysInMonth - elapsedDays)
  const projection = elapsedDays > 0 ? spent + (spent / elapsedDays) * daysLeft : spent
  return { isCurrent: true, daysInMonth, elapsedDays, daysLeft, projection }
}

/** Período corrente no formato `yyyy-mm`. */
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
