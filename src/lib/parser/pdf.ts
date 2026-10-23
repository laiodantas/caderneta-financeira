// ============================================================================
// Leitura de PDF com pdf.js (extração de texto + fallback para OCR)
// ----------------------------------------------------------------------------
// O pdf.js é carregado sob demanda (import dinâmico): ele pesa ~1 MB e só
// é necessário na tela de importação. Carregar por lá também evita que uma
// falha da biblioteca derrube a aplicação inteira.
// ============================================================================

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { RawTransaction, PendingInstallment } from '../../types'
import { extractFromText } from './text'
import { ocrCanvases } from './ocr'
import { detectBank } from '../../config/banks'
import { looksLikeFatura, parseFatura, type PdfPage, type PdfRow } from './fatura'

/* eslint-disable @typescript-eslint/no-explicit-any */
type PdfjsLib = typeof import('pdfjs-dist')

let pdfjsPromise: Promise<PdfjsLib> | null = null

/**
 * Carrega o pdf.js uma única vez.
 * O pacote é distribuído em UMD/CJS, então Depending do bundler o namespace
 * pode vir como export nomeado ou dentro de `default` — tratamos os dois.
 */
function loadPdfjs(): Promise<PdfjsLib> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((mod: any) => {
      const lib: PdfjsLib = mod?.default && mod.default.GlobalWorkerOptions ? mod.default : mod
      if (lib.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc = pdfWorker
      }
      return lib
    })
  }
  return pdfjsPromise
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface PdfTextItem {
  str: string
  transform: number[]
}

/** Reconstrói linhas de texto a partir dos itens do pdf.js (agrupando por y). */
function itemsToLines(items: PdfTextItem[]): string[] {
  const lines = new Map<number, { x: number; text: string }[]>()
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue
    const y = Math.round(it.transform[5])
    const x = it.transform[4] ?? 0
    if (!lines.has(y)) lines.set(y, [])
    lines.get(y)!.push({ x, text: it.str })
  }
  return [...lines.entries()]
    .sort((a, b) => b[0] - a[0]) // y decrescente = de cima para baixo
    .map(([, arr]) =>
      arr
        .sort((a, b) => a.x - b.x)
        .map((i) => i.text)
        .join(' '),
    )
}

/**
 * Agrupa os trechos de texto por linha visual, preservando a coordenada x.
 * É o que permite reconstruir as colunas de uma fatura de cartão.
 */
function itemsToRows(items: PdfTextItem[]): PdfRow[] {
  const rows = new Map<number, { x: number; text: string }[]>()
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue
    const y = Math.round(it.transform[5])
    const x = it.transform[4] ?? 0
    if (!rows.has(y)) rows.set(y, [])
    rows.get(y)!.push({ x, text: it.str })
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, arr]) => ({
      y,
      cells: arr
        .sort((a, b) => a.x - b.x)
        .map((i) => ({ x: i.x, text: i.text.trim() }))
        .filter((i) => i.text),
    }))
}

/** Extrai o texto de um PDF (texto selecionável). */
export async function extractPdfText(file: File): Promise<PdfTextResult> {
  const pages = await extractPdfPages(file)
  const text = pages.map((p) => p.text).join('\n')
  return {
    text,
    pages: pages.length,
    charCount: text.replace(/\s/g, '').length,
  }
}

/** Extrai as páginas do PDF com posição de cada trecho de texto. */
export async function extractPdfPages(
  file: File,
  onProgress?: (msg: string) => void,
  signal?: AbortSignal,
): Promise<(PdfPage & { ocr?: boolean })[]> {
  const pdfjs = await loadPdfjs()
  // Nesta versão corrigida não existe mais a opção isEvalSupported.
  const task = pdfjs.getDocument({ data: await file.arrayBuffer(), enableXfa: false })
  const abort = () => {
    void task.destroy()
  }
  signal?.addEventListener('abort', abort, { once: true })
  try {
    const pdf = await task.promise
    if (pdf.numPages > 100) throw new Error('O PDF deve ter no máximo 100 páginas.')
    const pages: (PdfPage & { ocr?: boolean })[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      signal?.throwIfAborted()
      onProgress?.(`Lendo página ${i} de ${pdf.numPages}…`)
      const page = await pdf.getPage(i)
      try {
        const content = await page.getTextContent()
        const items = content.items.filter((item) => 'str' in item) as unknown as PdfTextItem[]
        const text = itemsToLines(items).join('\n')
        if (text.replace(/\s/g, '').length >= 40) {
          pages.push({ rows: itemsToRows(items), text })
        } else {
          const viewport = page.getViewport({ scale: 2 })
          if (viewport.width * viewport.height > 24_000_000)
            throw new Error('Página muito grande para OCR. Reduza a resolução do PDF.')
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          try {
            await page.render({ canvasContext: canvas.getContext('2d')!, canvas, viewport }).promise
            const recognized = await ocrCanvases(
              [canvas],
              (fraction) =>
                onProgress?.(`OCR da página ${i}/${pdf.numPages}: ${Math.round(fraction * 100)}%`),
              signal,
            )
            pages.push({ rows: [], text: recognized, ocr: true })
          } finally {
            canvas.width = 0
            canvas.height = 0
          }
        }
      } finally {
        page.cleanup()
      }
    }
    return pages
  } finally {
    signal?.removeEventListener('abort', abort)
    await task.destroy()
  }
}

export interface PdfTextResult {
  text: string
  pages: number
  /** Número de caracteres úteis extraídos. */
  charCount: number
}

export interface ParsePdfResult {
  transactions: RawTransaction[]
  bank: string
  ocrUsed: boolean
  pages: number
  /** Parcelas que serão cobradas em faturas futuras ("próxima fatura"). */
  pendingInstallments?: PendingInstallment[]
}

/**
 * Lê um PDF de extrato e devolve as transações.
 * Se quase não houver texto (PDF escaneado), usa OCR como fallback.
 */
export async function parsePdf(
  file: File,
  onProgress?: (msg: string) => void,
  signal?: AbortSignal,
): Promise<ParsePdfResult> {
  onProgress?.('Lendo o PDF…')
  const pages = await extractPdfPages(file, onProgress, signal)
  const text = pages.map((p) => p.text).join('\n')
  const ocrUsed = pages.some((p) => p.ocr)
  const bank = detectBank(text)

  // Fatura de cartão: usa o parser de colunas (datas e valores exatos).
  const faturaLike = looksLikeFatura(pages)
  if (faturaLike) {
    onProgress?.('Fatura de cartão reconhecida — reconstruindo colunas…')
    const { transactions, pending } = parseFatura(pages)
    if (transactions.length) {
      const scanned = pages
        .filter((p) => p.ocr)
        .flatMap((p) => extractFromText(p.text, undefined, { isFatura: true }))
      return {
        transactions: [...transactions, ...scanned],
        bank,
        ocrUsed,
        pages: pages.length,
        pendingInstallments: pending,
      }
    }
  }

  // OCR não preserva colunas; se o texto ainda indicar fatura, ao menos
  // tratamos valores negativos como créditos/pagamentos.
  const ocrFatura = ocrUsed && /despesas da fatura|fatura atual/i.test(text)
  const transactions = extractFromText(text, undefined, { isFatura: faturaLike || ocrFatura })
  return { transactions, bank, ocrUsed, pages: pages.length }
}
