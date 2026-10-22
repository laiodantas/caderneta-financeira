// ============================================================================
// Testes das agregações usadas na interface.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { groupByMerchant } from '../aggregate'
import type { Transaction } from '../../types'

let seq = 0

function tx(over: Partial<Transaction>): Transaction {
  seq += 1
  return {
    id: `tx-${seq}`,
    date: '2026-09-01',
    description: 'Compra',
    merchant: 'Uber',
    amount: 10,
    type: 'saida',
    category: 'transporte',
    statementId: 's1',
    tags: [],
    ...over,
  }
}

describe('groupByMerchant', () => {
  it('guarda os lançamentos individuais de cada estabelecimento', () => {
    const list = [
      tx({ id: 'a', date: '2026-09-02', amount: 10 }),
      tx({ id: 'b', date: '2026-09-05', amount: 20 }),
      tx({ id: 'c', merchant: '99pop', amount: 5 }),
    ]

    const groups = groupByMerchant(list)
    const uber = groups.find((g) => g.merchant === 'Uber')

    expect(uber?.total).toBe(30)
    expect(uber?.count).toBe(2)
    expect(uber?.transactions.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('ordena os grupos do maior para o menor total', () => {
    const groups = groupByMerchant([
      tx({ merchant: 'Uber', amount: 10 }),
      tx({ merchant: '99pop', amount: 50 }),
    ])
    expect(groups.map((g) => g.merchant)).toEqual(['99pop', 'Uber'])
  })

  it('filtra pela categoria quando informada', () => {
    const groups = groupByMerchant(
      [
        tx({ merchant: 'Uber', category: 'transporte' }),
        tx({ merchant: 'iFood', category: 'restaurantes' }),
      ],
      'restaurantes',
    )
    expect(groups.map((g) => g.merchant)).toEqual(['iFood'])
  })

  it('ignora entradas na visão padrão de gastos', () => {
    const groups = groupByMerchant([
      tx({ merchant: 'Uber' }),
      tx({ merchant: 'Salário', type: 'entrada', category: 'renda' }),
    ])
    expect(groups.map((g) => g.merchant)).toEqual(['Uber'])
  })
})
