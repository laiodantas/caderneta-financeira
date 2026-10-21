// ============================================================================
// Despachante de importação: escolhe o leitor conforme a extensão do arquivo.
// ============================================================================

import type { RawTransaction } from '../../types'
import { parsePdf } from './pdf'
import { parseCSV } from './csv'
import { parseOFX } from './ofx'
import { detectBank } from '../../config/banks'

export interface ParseResult {
  bank: string
  transactions: RawTransaction[]
  source: 'pdf' | 'csv' | 'ofx'
  ocrUsed?: boolean
  pages?: number
}

export type ProgressFn = (msg: string) => void

/** Lê um arquivo e devolve as transações cruas + banco detectado. */
export async function parseFile(file: File, onProgress?: ProgressFn): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'pdf') {
    const res = await parsePdf(file, onProgress)
    return {
      bank: res.bank,
      transactions: res.transactions,
      source: 'pdf',
      ocrUsed: res.ocrUsed,
      pages: res.pages,
    }
  }

  if (ext === 'csv') {
    const text = await file.text()
    return {
      bank: detectBank(text),
      transactions: parseCSV(text),
      source: 'csv',
    }
  }

  if (ext === 'ofx' || ext === 'qif') {
    const text = await file.text()
    return {
      bank: detectBank(text),
      transactions: parseOFX(text),
      source: 'ofx',
    }
  }

  throw new Error(
    `Formato ".${ext}" não suportado. Envie um arquivo PDF, CSV ou OFX.`,
  )
}
