// ============================================================================
// Leitor de CSV (delimitador vírgula ou ponto-e-vírgula)
// ============================================================================

import type { RawTransaction } from '../../types'
import { parseDateText, parseMoneyToken } from './text'

const ENTRADA_KEYWORDS = [
  'pix recebido',
  'credito',
  'crédito',
  'deposito',
  'depósito',
  'salario',
  'salário',
  'estorno',
  'transferencia recebida',
  'pagamento recebido',
  'reembolso',
  'rendimento',
  'cashback',
]

/** Divide uma linha CSV respeitando aspas. */
function parseCSVLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function findCol(header: string[], candidates: string[]): number {
  const norm = header.map((h) =>
    h
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
  )
  for (const c of candidates) {
    const idx = norm.findIndex((h) => h.includes(c))
    if (idx >= 0) return idx
  }
  return -1
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function parseCSV(
  text: string,
  convention: 'account' | 'card' = 'account',
): RawTransaction[] {
  const lines: string[] = []
  let record = '',
    quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        record += '""'
        i++
        continue
      }
      quoted = !quoted
    }
    if (ch === '\n' && !quoted) {
      if (record.trim()) lines.push(record.replace(/\r$/, ''))
      record = ''
    } else record += ch
  }
  if (quoted) throw new Error('CSV com aspas não fechadas.')
  if (record.trim()) lines.push(record)

  if (lines.length < 2) return []

  const delim = lines[0].includes(';') ? ';' : ','
  const rows = lines.map((l) => parseCSVLine(l, delim))
  const header = rows[0]

  const dateIdx = findCol(header, ['data', 'date', 'dt', 'lançamento', 'lancamento'])
  const descIdx = findCol(header, [
    'descricao',
    'descrição',
    'historico',
    'histórico',
    'desc',
    'lançamento',
    'lancamento',
    'nome',
    'estabelecimento',
  ])
  const amountIdx = findCol(header, ['valor', 'amount', 'valor (r$)', 'valor r$', 'valor brl'])
  const typeIdx = findCol(header, [
    'tipo',
    'natureza',
    'debito',
    'débito',
    'credito',
    'crédito',
    'entrada/saida',
    'sinal',
  ])

  if (amountIdx < 0 || dateIdx < 0 || descIdx < 0)
    throw new Error('O CSV precisa de colunas Data, Descrição e Valor.')

  const result: RawTransaction[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row[amountIdx]) throw new Error(`Valor ausente na linha ${r + 1} do CSV.`)

    const parsed = parseMoneyToken(row[amountIdx])
    if (!parsed) throw new Error(`Valor inválido na linha ${r + 1} do CSV.`)
    if (parsed.value === 0) continue

    const desc = row[descIdx] ?? ''
    let type: 'entrada' | 'saida'

    if (typeIdx >= 0) {
      const t = norm(row[typeIdx] ?? '')
      if (/entrada|cr[ée]dito|credito|\bc\b/.test(t)) type = 'entrada'
      else if (/sa[íi]da|d[ée]bito|debito|\bd\b/.test(t)) type = 'saida'
      else type = parsed.negative ? 'saida' : 'entrada'
    } else {
      type = parsed.negative ? (convention === 'card' ? 'entrada' : 'saida') : 'entrada'
    }

    // Sem sinal explícito e sem coluna de tipo: usa palavras-chave.
    if (convention === 'card' && !parsed.negative && typeIdx < 0) {
      type = ENTRADA_KEYWORDS.some((k) => norm(desc).includes(k)) ? 'entrada' : 'saida'
    }

    const date = dateIdx >= 0 && row[dateIdx] ? (parseDateText(row[dateIdx]) ?? '') : ''

    result.push({ date, description: desc, amount: parsed.value, type })
  }

  return result
}
