// ============================================================================
// Insights: gastos recorrentes, anomalias, duplicidades, resumo inteligente,
// dia da semana mais caro, projeção, comparação entre meses, etc.
// ============================================================================

import type { Transaction } from '../types'
import { formatBRL } from './format'
import { groupByMonth, groupByMerchant, pctChange } from './aggregate'
import type { MerchantGroup } from './aggregate'

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

/** Maior despesa do conjunto. */
export function biggestExpense(txs: Transaction[]): Transaction | null {
  const saidas = txs.filter((t) => t.type === 'saida')
  if (!saidas.length) return null
  return saidas.reduce((a, b) => (b.amount > a.amount ? b : a))
}

/** Média de gasto por dia (considera apenas dias com gasto). */
export function avgDailySpend(txs: Transaction[]): number {
  const days = new Set(txs.filter((t) => t.type === 'saida').map((t) => t.date))
  const total = txs.filter((t) => t.type === 'saida').reduce((a, t) => a + t.amount, 0)
  return days.size ? total / days.size : 0
}

/** Dia da semana em que mais se gasta (com total). */
export function mostExpensiveWeekday(txs: Transaction[]): { weekday: string; total: number } {
  const map = new Map<number, number>()
  for (const t of txs) {
    if (t.type !== 'saida') continue
    const d = new Date(`${t.date}T12:00:00`)
    if (Number.isNaN(d.getTime())) continue
    const wd = d.getDay()
    map.set(wd, (map.get(wd) ?? 0) + t.amount)
  }
  if (!map.size) return { weekday: '—', total: 0 }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
  return { weekday: WEEKDAYS[sorted[0][0]], total: sorted[0][1] }
}

/** Projeção de fim de mês: média diária × dias restantes. */
export function endOfMonthProjection(txs: Transaction[]): { spent: number; projection: number; daysLeft: number } {
  const saidas = txs.filter((t) => t.type === 'saida')
  const spent = saidas.reduce((a, t) => a + t.amount, 0)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysLeft = Math.max(0, daysInMonth - dayOfMonth)
  const elapsed = Math.max(1, dayOfMonth)
  const projection = spent + (spent / elapsed) * daysLeft
  return { spent, projection, daysLeft }
}

/** Detecta gastos recorrentes: mesmo estabelecimento repetido em ≥ 2 meses. */
export function recurringExpenses(txs: Transaction[]): MerchantGroup[] {
  const saidas = txs.filter((t) => t.type === 'saida')
  const months = new Set(saidas.map((t) => t.date.slice(0, 7)))
  if (months.size < 2) return []
  return groupByMerchant(saidas)
    .filter((m) => {
      const periods = new Set(
        saidas.filter((t) => t.merchant === m.merchant).map((t) => t.date.slice(0, 7)),
      )
      return periods.size >= 2
    })
    .slice(0, 8)
}

export interface RepeatedCharge {
  merchant: string
  categoryId: string
  /** Quantas vezes o estabelecimento foi cobrado. */
  count: number
  /** Soma de todas as cobranças. */
  total: number
  /** Datas das cobranças (ordenadas). */
  dates: string[]
  /** Aparece em mais de um mês (recorrência mensal). */
  monthly: boolean
  /** Quantas vezes repetiu no mesmo dia (possível duplicidade). */
  sameDay: number
  /** Maior cobrança individual. */
  max: number
}

/**
 * Destaca COBRANÇAS REPETIDAS: o mesmo estabelecimento sendo cobrado mais de
 * uma vez no período (não importa se é no mesmo dia ou em dias diferentes).
 * É o tipo de coisa que passa batido numa fatura de cartão.
 */
export function repeatedCharges(txs: Transaction[], minCount = 2): RepeatedCharge[] {
  const saidas = txs.filter((t) => t.type === 'saida')
  const byMerchant = new Map<string, Transaction[]>()
  for (const t of saidas) {
    const arr = byMerchant.get(t.merchant) ?? []
    arr.push(t)
    byMerchant.set(t.merchant, arr)
  }

  const out: RepeatedCharge[] = []
  for (const [merchant, list] of byMerchant) {
    if (list.length < minCount) continue
    const dates = list.map((t) => t.date).sort()
    const dayCount = new Map<string, number>()
    for (const d of dates) dayCount.set(d, (dayCount.get(d) ?? 0) + 1)
    const sameDay = [...dayCount.values()].filter((n) => n > 1).length
    const months = new Set(dates.map((d) => d.slice(0, 7)))

    out.push({
      merchant,
      categoryId: list[0].category,
      count: list.length,
      total: list.reduce((a, t) => a + t.amount, 0),
      dates,
      monthly: months.size > 1,
      sameDay,
      max: Math.max(...list.map((t) => t.amount)),
    })
  }

  return out.sort((a, b) => b.total - a.total || b.count - a.count)
}

export interface InstallmentPlan {
  /** Chave estável do plano (estabelecimento + nº de parcelas). */
  key: string
  description: string
  merchant: string
  categoryId: string
  /** Parcela mais alta vista até agora. */
  current: number
  /** Total de parcelas do plano. */
  total: number
  /** Valor de uma parcela. */
  installmentAmount: number
  /** Valor total planejado (parcela × total). */
  planTotal: number
  /** Quanto já foi cobrado (soma das parcelas pagas). */
  paid: number
  /** Quanto ainda falta cobrar. */
  remaining: number
  /** Percentual já pago (0–100). */
  progress: number
  transactions: Transaction[]
}

/**
 * Agrupa as transações parceladas em PLANOS (compra parcelada), para não
 * contar cada parcela como uma despesa nova.
 */
export function installmentPlans(txs: Transaction[]): InstallmentPlan[] {
  const parceladas = txs.filter((t) => t.installment)
  const byPlan = new Map<string, Transaction[]>()

  for (const t of parceladas) {
    const key = `${t.merchant}|${t.installment!.total}`
    const arr = byPlan.get(key) ?? []
    arr.push(t)
    byPlan.set(key, arr)
  }

  const plans: InstallmentPlan[] = []
  for (const [key, list] of byPlan) {
    const total = list[0].installment!.total
    const current = Math.max(...list.map((t) => t.installment!.current))
    const installmentAmount = Math.max(...list.map((t) => t.amount))
    const paid = list.reduce((a, t) => a + t.amount, 0)
    const planTotal = installmentAmount * total

    plans.push({
      key,
      description: list[0].description,
      merchant: list[0].merchant,
      categoryId: list[0].category,
      current,
      total,
      installmentAmount,
      planTotal,
      paid,
      remaining: Math.max(0, planTotal - paid),
      progress: planTotal ? Math.min(100, (paid / planTotal) * 100) : 0,
      transactions: list,
    })
  }

  return plans.sort((a, b) => b.planTotal - a.planTotal)
}

/** As N maiores cobranças individuais (saídas) do conjunto. */
export function topCharges(txs: Transaction[], limit = 5): Transaction[] {
  return txs
    .filter((t) => t.type === 'saida')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

/** Detecta transações muito acima do normal para o mesmo estabelecimento. */
export function anomalies(txs: Transaction[]): Transaction[] {
  const saidas = txs.filter((t) => t.type === 'saida')
  const byMerchant = new Map<string, number[]>()
  for (const t of saidas) {
    const arr = byMerchant.get(t.merchant) ?? []
    arr.push(t.amount)
    byMerchant.set(t.merchant, arr)
  }
  const result: Transaction[] = []
  for (const t of saidas) {
    const arr = byMerchant.get(t.merchant) ?? []
    if (arr.length < 2) continue
    const median = medianOf(arr)
    if (median > 0 && t.amount > median * 2.5) result.push(t)
  }
  return result
}

function medianOf(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Detecta prováveis duplicidades: mesmo merchant, data e valor. */
export function duplicates(txs: Transaction[]): Transaction[][] {
  const map = new Map<string, Transaction[]>()
  for (const t of txs) {
    const key = `${t.merchant}|${t.date}|${t.amount.toFixed(2)}`
    const arr = map.get(key) ?? []
    arr.push(t)
    map.set(key, arr)
  }
  return [...map.values()].filter((a) => a.length > 1)
}

export interface MonthComparison {
  period: string
  previousPeriod: string | null
  total: number
  changePct: number | null
  byCategory: { categoryId: string; total: number; changePct: number | null }[]
}

/** Compara o mês atual com o anterior, por categoria. */
export function compareMonths(txs: Transaction[]): MonthComparison | null {
  const months = groupByMonth(txs)
  if (months.length < 1) return null
  const current = months[months.length - 1]
  const previous = months.length > 1 ? months[months.length - 2] : null

  const curOut = new Map<string, number>()
  const prevOut = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'saida') continue
    const period = t.date.slice(0, 7)
    if (period === current.period) curOut.set(t.category, (curOut.get(t.category) ?? 0) + t.amount)
    else if (previous && period === previous.period) prevOut.set(t.category, (prevOut.get(t.category) ?? 0) + t.amount)
  }

  const byCategory = [...curOut.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      total,
      changePct: pctChange(total, prevOut.get(categoryId) ?? 0),
    }))
    .sort((a, b) => b.total - a.total)

  return {
    period: current.period,
    previousPeriod: previous?.period ?? null,
    total: current.saidas,
    changePct: previous ? pctChange(current.saidas, previous.saidas) : null,
    byCategory,
  }
}

/** Resumo em texto, como anotação de caderno. */
export function smartSummary(txs: Transaction[]): string {
  const saidas = txs.filter((t) => t.type === 'saida')
  if (!saidas.length) return ''

  const total = saidas.reduce((a, t) => a + t.amount, 0)
  const biggest = biggestExpense(txs)
  const top = groupByMerchant(saidas).slice(0, 2)
  const weekday = mostExpensiveWeekday(txs)
  const rec = recurringExpenses(txs)

  const parts: string[] = []
  parts.push(`No período, você gastou ${formatBRL(total)} no total.`)

  if (top.length) {
    parts.push(`Os maiores gastos foram em ${top[0].merchant}${top[1] ? ` e ${top[1].merchant}` : ''}.`)
  }
  if (biggest) {
    parts.push(`A maior despesa única foi ${formatBRL(biggest.amount)} (${biggest.merchant}).`)
  }
  if (weekday.total > 0) {
    parts.push(`O dia mais caro costuma ser ${weekday.weekday}.`)
  }
  if (rec.length) {
    parts.push(
      `Você tem ${rec.length} gasto${rec.length > 1 ? 's' : ''} recorrente${rec.length > 1 ? 's' : ''}, como ${rec
        .slice(0, 2)
        .map((r) => r.merchant)
        .join(' e ')}.`,
    )
  }

  return parts.join(' ')
}
