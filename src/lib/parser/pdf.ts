// ============================================================================
// Leitura de PDF com pdf.js (extração de texto + fallback para OCR)
// ----------------------------------------------------------------------------
// O pdf.js é carregado sob demanda (import dinâmico): ele pesa ~1 MB e só
// é necessário na tela de importação. Carregar por lá também evita que uma
// falha da biblioteca derrube a aplicação inteira.
// ============================================================================

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url'
import type { RawTransaction } from '../../types'
import { extractFromText } from './text'
import { ocrCanvases } from './ocr'
import { detectBank } from '../../config/banks'

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
    .map(([, arr]) => arr.sort((a, b) => a.x - b.x).map((i) => i.text).join(' '))
}

/** Extrai o texto de um PDF (texto selecionável). */
export async function extractPdfText(file: File): Promise<PdfTextResult> {
  const pdfjs = await loadPdfjs()
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise

  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += itemsToLines(content.items as unknown as PdfTextItem[]).join('\n') + '\n'
  }

  return { text, pages: pdf.numPages, charCount: text.replace(/\s/g, '').length }
}

/** Renderiza páginas do PDF em canvas (para OCR). */
export async function renderPdfPages(file: File, scale = 2): Promise<HTMLCanvasElement[]> {
  const pdfjs = await loadPdfjs()
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  const canvases: HTMLCanvasElement[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    canvases.push(canvas)
  }
  return canvases
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
}

/**
 * Lê um PDF de extrato e devolve as transações.
 * Se quase não houver texto (PDF escaneado), usa OCR como fallback.
 */
export async function parsePdf(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<ParsePdfResult> {
  onProgress?.('Lendo o PDF…')
  let { text, pages, charCount } = await extractPdfText(file)

  let ocrUsed = false
  // Menos de ~40 caracteres por página indica PDF escaneado.
  if (pages > 0 && charCount / pages < 40) {
    ocrUsed = true
    onProgress?.('PDF escaneado detectado — iniciando OCR…')
    const canvases = await renderPdfPages(file, 2)
    const ocrText = await ocrCanvases(canvases, (p) => {
      onProgress?.(`Reconhecendo texto… ${Math.round(p * 100)}%`)
    })
    text = ocrText
    charCount = text.replace(/\s/g, '').length
  }

  const bank = detectBank(text)
  const transactions = extractFromText(text)

  return { transactions, bank, ocrUsed, pages }
}
