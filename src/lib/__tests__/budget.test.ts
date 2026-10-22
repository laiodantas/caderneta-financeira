// ============================================================================
// Testes do orçamento: migração do formato antigo, valor por mês e projeção.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../../config/categories'
import {
  budgetBase,
  budgetForMonth,
  budgetForPeriods,
  currentPeriod,
  hasAnyBudget,
  hasBaseOverride,
  hasMonthOverride,
  normalizeBudgetMap,
  projectionForPeriod,
  totalBudgetForPeriods,
} from '../budget'

describe('normalizeBudgetMap', () => {
  it('migra o formato antigo (número simples) para o formato atual', () => {
    const budgets = normalizeBudgetMap({ transporte: 500 })
    expect(budgets.transporte).toEqual({ base: 500, months: {} })
  })

  it('mantém o padrão e os valores por mês', () => {
    const budgets = normalizeBudgetMap({
      mercado: { base: 900, months: { '2026-09': 800 } },
    })
    expect(budgets.mercado).toEqual({ base: 900, months: { '2026-09': 800 } })
  })

  it('descarta lixo sem quebrar', () => {
    const budgets = normalizeBudgetMap({
      a: null,
      b: 'x',
      c: { base: 'muito', months: { '2026-09': 'errado', '2026-10': 300 } },
    })
    expect(budgets.a).toBeUndefined()
    expect(budgets.b).toBeUndefined()
    expect(budgets.c).toEqual({ base: undefined, months: { '2026-10': 300 } })
  })

  it('aceita entrada que não é objeto', () => {
    expect(normalizeBudgetMap(null)).toEqual({})
    expect(normalizeBudgetMap('x')).toEqual({})
  })
})

describe('orçamento por mês', () => {
  const budgets = normalizeBudgetMap({
    transporte: 500,
    mercado: { base: 900, months: { '2026-09': 800 } },
    saude: { months: { '2026-09': 300 } },
  })

  it('usa o valor do mês quando existe', () => {
    expect(budgetForMonth(budgets, 'mercado', '2026-09')).toBe(800)
  })

  it('usa o padrão do usuário nos outros meses', () => {
    expect(budgetForMonth(budgets, 'mercado', '2026-10')).toBe(900)
    expect(budgetForMonth(budgets, 'transporte', '2026-10')).toBe(500)
  })

  it('cai no padrão da categoria quando o usuário nunca definiu nada', () => {
    expect(budgetForMonth(budgets, 'restaurantes', '2026-09')).toBe(600)
    expect(budgetBase(budgets, 'restaurantes')).toBe(600)
  })

  it('permite valor só de um mês, sem padrão próprio', () => {
    expect(budgetForMonth(budgets, 'saude', '2026-09')).toBe(300)
    expect(budgetForMonth(budgets, 'saude', '2026-10')).toBe(400)
  })

  it('soma os meses no período completo', () => {
    expect(budgetForPeriods(budgets, 'mercado', ['2026-09', '2026-10'])).toBe(1700)
  })

  it('sabe quando há valor definido pelo usuário', () => {
    expect(hasBaseOverride(budgets, 'transporte')).toBe(true)
    expect(hasBaseOverride(budgets, 'saude')).toBe(false)
    expect(hasMonthOverride(budgets, 'saude', '2026-09')).toBe(true)
    expect(hasMonthOverride(budgets, 'saude', '2026-10')).toBe(false)
    expect(hasAnyBudget(budgets, 'saude')).toBe(true)
    expect(hasAnyBudget(budgets, 'extras')).toBe(false)
  })
})

describe('total do orçamento', () => {
  it('soma todas as categorias de gasto (sem Extras e Renda)', () => {
    const budgets = normalizeBudgetMap({})
    const periods = ['2026-09']
    const expected = CATEGORIES.filter((c) => c.id !== 'extras' && c.id !== 'renda').reduce(
      (acc, c) => acc + budgetForMonth(budgets, c.id, '2026-09'),
      0,
    )
    expect(totalBudgetForPeriods(budgets, periods)).toBe(expected)
  })

  it('considera os valores específicos do mês', () => {
    const periods = ['2026-09']
    const semAjuste = totalBudgetForPeriods(normalizeBudgetMap({}), periods)
    const comAjuste = totalBudgetForPeriods(
      normalizeBudgetMap({ transporte: { base: 500, months: { '2026-09': 1000 } } }),
      periods,
    )
    expect(comAjuste).toBe(semAjuste + 500)
  })
})

describe('projeção de fim de mês', () => {
  const now = new Date(2026, 8, 15, 12, 0, 0) // 15/09/2026

  it('projeta o gasto no ritmo atual do mês corrente', () => {
    const p = projectionForPeriod(1500, '2026-09', now)
    expect(p.isCurrent).toBe(true)
    expect(p.daysInMonth).toBe(30)
    expect(p.elapsedDays).toBe(15)
    expect(p.daysLeft).toBe(15)
    expect(p.projection).toBe(3000)
  })

  it('não projeta meses passados', () => {
    const p = projectionForPeriod(1500, '2026-08', now)
    expect(p.isCurrent).toBe(false)
    expect(p.projection).toBe(1500)
  })

  it('lida com gasto zero', () => {
    expect(projectionForPeriod(0, '2026-09', now).projection).toBe(0)
  })

  it('devolve o período corrente no formato yyyy-mm', () => {
    expect(currentPeriod(now)).toBe('2026-09')
    expect(currentPeriod(new Date(2026, 0, 5))).toBe('2026-01')
  })
})
