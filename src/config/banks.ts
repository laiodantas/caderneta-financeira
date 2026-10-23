// ============================================================================
// CONFIGURAÇÃO DE BANCOS / LEITORES
// ----------------------------------------------------------------------------
// Cada banco tem "pistas" (strings que aparecem no texto do PDF) para
// detectá-lo automaticamente, e um conjunto de padrões específicos de linha.
// O parser genérico (lib/parser/pdf.ts) é usado como fallback quando o banco
// não é identificado. Edite livremente para melhorar o suporte ao seu banco.
// ============================================================================

export interface BankProfile {
  id: string
  name: string
  /** Strings que, se encontradas no texto, indicam este banco. */
  hints: string[]
  /** Extensões de arquivo típicas (sem o ponto). */
  extensions: string[]
}

export const BANKS: BankProfile[] = [
  {
    id: 'nubank',
    name: 'Nubank',
    hints: ['nubank', 'nu pagamentos'],
    extensions: ['pdf', 'csv', 'ofx'],
  },
  {
    id: 'itau',
    name: 'Itaú',
    hints: ['itaú', 'itau', 'itaú unibanco'],
    extensions: ['pdf', 'csv', 'ofx'],
  },
  { id: 'bradesco', name: 'Bradesco', hints: ['bradesco'], extensions: ['pdf', 'csv', 'ofx'] },
  { id: 'santander', name: 'Santander', hints: ['santander'], extensions: ['pdf', 'csv', 'ofx'] },
  {
    id: 'inter',
    name: 'Inter',
    hints: ['banco inter', 'inter&co'],
    extensions: ['pdf', 'csv', 'ofx'],
  },
  {
    id: 'bb',
    name: 'Banco do Brasil',
    hints: ['banco do brasil'],
    extensions: ['pdf', 'csv', 'ofx'],
  },
  {
    id: 'caixa',
    name: 'Caixa',
    hints: ['caixa econômica', 'caixa economica'],
    extensions: ['pdf', 'csv', 'ofx'],
  },
  { id: 'c6', name: 'C6 Bank', hints: ['c6 bank', 'c6bank'], extensions: ['pdf', 'csv', 'ofx'] },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    hints: ['mercado pago', 'mercadopago'],
    extensions: ['pdf', 'csv', 'ofx'],
  },
]

/** Detecta o banco a partir do texto bruto do extrato. */
export function detectBank(text: string): string {
  const t = text.toLowerCase()
  for (const bank of BANKS) {
    if (bank.hints.some((h) => t.includes(h))) return bank.name
  }
  return 'Não identificado'
}
