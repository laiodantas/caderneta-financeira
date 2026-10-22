// ============================================================================
// Testes da limpeza de nomes vindos da importação.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { cleanImportArtifacts } from '../normalize'

describe('cleanImportArtifacts', () => {
  it('remove o marcador de parcela com parênteses', () => {
    expect(cleanImportArtifacts('NUBIA CAMELO DANTAS (Parcela 03 de 04)')).toBe(
      'NUBIA CAMELO DANTAS',
    )
  })

  it('remove o marcador no formato com barra', () => {
    expect(cleanImportArtifacts('MERCADO LIVRE (Parcela 01/10)')).toBe('MERCADO LIVRE')
  })

  it('remove parênteses vazios', () => {
    expect(cleanImportArtifacts('Recupera UNP EAD ( )')).toBe('Recupera UNP EAD')
    expect(cleanImportArtifacts('Shopee*BAZAM ()')).toBe('Shopee*BAZAM')
  })

  it('preserva o restante do texto', () => {
    expect(cleanImportArtifacts('PIX CRED PARCELADO (Parcela 2 de 4) LOJA')).toBe(
      'PIX CRED PARCELADO LOJA',
    )
  })

  it('não quebra com texto vazio', () => {
    expect(cleanImportArtifacts('')).toBe('')
    expect(cleanImportArtifacts('   ')).toBe('')
  })
})
