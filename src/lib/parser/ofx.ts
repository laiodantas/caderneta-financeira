// ============================================================================
// Leitor de OFX (Open Financial Exchange)
// ============================================================================

import type { RawTransaction } from '../../types'
import { parseMoneyToken } from './text'

function grab(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? m[1].trim() : null
}

function parseOFXDate(raw: string): string {
  // OFX: "20261015120000[-3:BRT]" → "2026-10-15"
  const m = raw.match(/(\d{4})(\d{2})(\d{2})/)
  if (!m) return ''
  return `${m[1]}-${m[2]}-${m[3]}`
}

export function parseOFX(text: string): RawTransaction[] {
  const blocks = [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)]
  const result: RawTransaction[] = []

  for (const match of blocks) {
    const block = match[1]
    const amountRaw = grab(block, 'TRNAMT')
    if (!amountRaw) continue

    const parsed = parseMoneyToken(amountRaw)
    if (!parsed || parsed.value === 0) continue

    const date = parseOFXDate(grab(block, 'DTPOSTED') ?? '')
    const description = grab(block, 'MEMO') ?? grab(block, 'NAME') ?? ''

    // OFX: negativo = débito (saída); positivo = crédito (entrada).
    const type: 'entrada' | 'saida' = parsed.negative ? 'saida' : 'entrada'

    result.push({ date, description, amount: parsed.value, type })
  }

  return result
}
