import type { RawTransaction, PendingInstallment } from '../types'
import { parseAmountInput } from './format'
import { parseDateText } from './parser/text'
export interface PreviewRow extends Omit<RawTransaction, 'amount'> {
  id: string
  amountStr: string
  category: string
}
export interface ImportDraft {
  fileName: string
  bank: string
  period: string
  label: string
  source: 'pdf' | 'csv' | 'ofx'
  ocrUsed: boolean
  preview: PreviewRow[]
  pending: PendingInstallment[]
}
export const emptyImportDraft = (): ImportDraft => ({
  fileName: '',
  bank: '',
  period: '',
  label: '',
  source: 'pdf',
  ocrUsed: false,
  preview: [],
  pending: [],
})
export function validPreviewRow(row: PreviewRow): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
    parseDateText(row.date) === row.date &&
    row.description.trim().length > 0 &&
    (parseAmountInput(row.amountStr) ?? 0) > 0
  )
}
