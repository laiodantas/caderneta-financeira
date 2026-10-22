// ============================================================================
// Testes da formatação de moeda.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { formatBRL } from '../format'

/** Normaliza o espaço não separável que o Intl usa depois de "R$". */
function normalizar(valor: string): string {
  return valor.replace(/\u00a0/g, ' ')
}

describe('formatBRL', () => {
  it('formata números', () => {
    expect(normalizar(formatBRL(1234.5))).toBe('R$ 1.234,50')
  })

  it('converte valores em texto (dados antigos salvos no navegador)', () => {
    expect(normalizar(formatBRL('50'))).toBe('R$ 50,00')
  })

  it('não quebra com valor inválido', () => {
    expect(normalizar(formatBRL('—'))).toBe('R$ 0,00')
    expect(normalizar(formatBRL(NaN))).toBe('R$ 0,00')
  })
})
