// ============================================================================
// Agregações: totais, agrupamentos por categoria/estabelecimento/mês
// ============================================================================

import type { Transaction } from '../types'
import { categoryColor, categoryName } from '../config/categories'

export interface Totals {
  entradas: number
  saidas: number
  saldo: number
  /** Quantidade de transações consideradas (ignora status "ignorar"). */
  count: number
}

/** Transações "válidas" para os cálculos (ignora as marcadas como "ignorar"). */
export function activeTransactions(txs: Transaction[]): Transaction[] {
  return txs.filter((t) => t.status !== 'ignorar')
}

export function totalsOf(txs: Transaction[]): Totals {
  let entradas = 0
  let saidas = 0
  let count = 0
  for (const t of txs) {
    count += 1
    if (t.type === 'entrada') entradas += t.amount
    else saidas += t.amount
  }
  return { entradas, saidas, saldo: entradas - saidas, count }
}

export interface CategoryGroup {
  categoryId: string
  name: string
  color: string
  total: number
  count: number
  /** % em relação ao total de SAÍDAS. */
  percent: number
}

/** Agrupa as SAÍDAS por categoria, ordenadas do maior para o menor. */
export function groupByCategory(txs: Transaction[]): CategoryGroup[] {
  const out = txs.filter((t) => t.type === 'saida')
  const totalSaidas = out.reduce((acc, t) => acc + t.amount, 0) || 1

  const map = new Map<string, CategoryGroup>()
  for (const t of out) {
    const g = map.get(t.category) ?? {
      categoryId: t.category,
      name: categoryName(t.category),
      color: categoryColor(t.category),
      total: 0,
      count: 0,
      percent: 0,
    }
    g.total += t.amount
    g.count += 1
    map.set(t.category, g)
  }

  const groups = [...map.values()].map((g) => ({
    ...g,
    percent: (g.total / totalSaidas) * 100,
  }))

  return groups.sort((a, b) => b.total - a.total)
}

export interface MerchantGroup {
  merchant: string
  categoryId: string
  total: number
  count: number
}

/** Agrupa transações por estabelecimento (dentro de uma categoria ou no geral). */
export function groupByMerchant(
  txs: Transaction[],
  categoryId?: string,
  type: 'saida' | 'entrada' | 'all' = 'saida',
): MerchantGroup[] {
  const filtered = txs.filter((t) => {
    if (categoryId && t.category !== categoryId) return false
    if (type === 'saida' && t.type !== 'saida') return false
    if (type === 'entrada' && t.type !== 'entrada') return false
    return true
  })

  const map = new Map<string, MerchantGroup>()
  for (const t of filtered) {
    const g = map.get(t.merchant) ?? {
      merchant: t.merchant,
      categoryId: t.category,
      total: 0,
      count: 0,
    }
    g.total += t.amount
    g.count += 1
    map.set(t.merchant, g)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export interface MonthBucket {
  period: string
  entradas: number
  saidas: number
  saldo: number
}

/** Agrupa por mês, em ordem cronológica. */
export function groupByMonth(txs: Transaction[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>()
  for (const t of txs) {
    const period = t.date.slice(0, 7)
    const b = map.get(period) ?? { period, entradas: 0, saidas: 0, saldo: 0 }
    if (t.type === 'entrada') b.entradas += t.amount
    else b.saidas += t.amount
    b.saldo = b.entradas - b.saidas
    map.set(period, b)
  }
  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period))
}

export interface BalancePoint {
  date: string
  saldo: number
}

/** Evolução do saldo acumulado ao longo do tempo (ordenado por data). */
export function balanceEvolution(txs: Transaction[]): BalancePoint[] {
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date))
  let saldo = 0
  return sorted.map((t) => {
    saldo += t.type === 'entrada' ? t.amount : -t.amount
    return { date: t.date, saldo }
  })
}

/** Variação percentual entre dois valores (evita divisão por zero). */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}
