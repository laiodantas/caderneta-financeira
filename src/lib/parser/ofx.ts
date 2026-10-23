// ============================================================================
// Leitor de OFX (Open Financial Exchange)
// ============================================================================

import type { RawTransaction } from '../../types'
import { parseMoneyToken } from './text'

function grab(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))
  return m ? m[1].trim() : null
}

function parseOFXDate(raw: string): string {
  // OFX: "20261015120000[-3:BRT]" → "2026-10-15"
  const m = raw.match(/(\d{4})(\d{2})(\d{2})/)
  if (!m) return ''
  const iso = `${m[1]}-${m[2]}-${m[3]}`
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : ''
}

export function parseOFX(text: string): RawTransaction[] {
  const blocks = [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)]
  const result: RawTransaction[] = []

  for (const match of blocks) {
    const block = match[1]
    const amountRaw = grab(block, 'TRNAMT')
    if (!amountRaw) throw new Error('Lançamento OFX sem valor. Revise o arquivo antes de importar.')

    const parsed = parseMoneyToken(amountRaw)
    if (!parsed) throw new Error('Lançamento OFX com valor inválido.')
    if (parsed.value === 0) continue

    const date = parseOFXDate(grab(block, 'DTPOSTED') ?? '')
    const description = grab(block, 'MEMO') ?? grab(block, 'NAME') ?? ''

    // OFX: negativo = débito (saída); positivo = crédito (entrada).
    const type: 'entrada' | 'saida' = parsed.negative ? 'saida' : 'entrada'

    result.push({ date, description, amount: parsed.value, type })
  }

  return result
}
