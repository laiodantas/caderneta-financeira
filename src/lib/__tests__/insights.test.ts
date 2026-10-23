// ============================================================================
// Testes dos insights usados para sinalizar duplicidades no extrato.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { duplicates } from '../insights'
import type { Transaction } from '../../types'

let seq = 0

function tx(over: Partial<Transaction>): Transaction {
  seq += 1
  return {
    id: `tx-${seq}`,
    date: '2026-09-10',
    description: 'Compra',
    merchant: 'Mercado Livre',
    amount: 119.8,
    type: 'saida',
    category: 'compras',
    statementId: 's1',
    tags: [],
    ...over,
  }
}

describe('duplicates', () => {
  it('agrupa cobranças com mesmo estabelecimento, data e valor', () => {
    const groups = duplicates([tx({ id: 'a' }), tx({ id: 'b' }), tx({ id: 'c', amount: 50 })])

    expect(groups).toHaveLength(1)
    expect(groups[0].map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('não marca o mesmo estabelecimento em dias diferentes', () => {
    const groups = duplicates([
      tx({ id: 'a', date: '2026-09-10' }),
      tx({ id: 'b', date: '2026-09-11' }),
    ])

    expect(groups).toHaveLength(0)
  })

  it('não marca valores diferentes no mesmo dia', () => {
    const groups = duplicates([tx({ id: 'a', amount: 10 }), tx({ id: 'b', amount: 20 })])

    expect(groups).toHaveLength(0)
  })
})
