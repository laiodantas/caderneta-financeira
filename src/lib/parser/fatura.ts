// ============================================================================
// Parser de FATURA DE CARTÃO DE CRÉDITO (PDF)
// ----------------------------------------------------------------------------
// Extratos de cartão não são extratos de conta: eles vêm em tabelas com
// colunas fixas (Data | Movimentação | Beneficiário | Valor) e várias linhas
// quebradas por transação (ex.: "PIX CRED P ARCELADO" + "(Parcela 01 de 04)" +
// "Principal (R$ 14,37) + Juros (R$ 4,81)").
//
// Ler esses PDFs com o parser genérico de texto gera lixo: vencimento da fatura
// virando transação, opções de parcelamento virando despesa, boleto virando
// lançamento e — o pior — a data "03 de jul. 2026" não sendo reconhecida.
//
// Aqui usamos as COORDENADAS (x/y) de cada trecho de texto do pdf.js para
// reconstruir as colunas e montar cada transação corretamente.
// ============================================================================

import type { RawTransaction, PendingInstallment } from '../../types'
import { parseDateText, parseMoneyToken } from './text'
import { normalizeDescription } from '../normalize'

// --- Estruturas -------------------------------------------------------------

export interface PdfCell {
  /** Posição horizontal do início do trecho de texto. */
  x: number
  text: string
}

export interface PdfRow {
  /** Posição vertical (maior = mais acima na página). */
  y: number
  cells: PdfCell[]
}

export interface PdfPage {
  rows: PdfRow[]
  /** Texto da página (linhas), usado para detectar o tipo de documento. */
  text: string
}

/**
 * Converte a data da fatura para ISO.
 * Aceita "03 de jul. 2026", "03 JUL 2026", "03/07/2026" e "03/07".
 */
export function parseFaturaDate(text: string): string | null {
  return parseDateText(text)
}

/** "(Parcela 03 de 04)" → { current: 3, total: 4 }. */
export function parseInstallmentMarker(text: string): { current: number; total: number } | null {
  const m = text.match(/\bparcela\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})\b/i)
  if (!m) return null
  const current = parseInt(m[1], 10)
  const total = parseInt(m[2], 10)
  if (!current || !total || current > total) return null
  return { current, total }
}

// --- Detecção do layout -----------------------------------------------------

interface ColumnBounds {
  /** x mínimo (inclusivo) de cada coluna: data, movimentação, beneficiário, valor. */
  data: number
  mov: number
  ben: number
  valor: number
}

/**
 * Procura o cabeçalho "Data | Movimentação | Beneficiário | Valor" numa linha
 * e devolve os limites de cada coluna (pontos médios entre cabeçalhos).
 */
function detectHeaderRow(row: PdfRow): ColumnBounds | null {
  let dataX: number | null = null
  let movX: number | null = null
  let benX: number | null = null
  let valorX: number | null = null

  for (const cell of row.cells) {
    const t = cell.text.trim()
    if (/^data$/i.test(t)) dataX = cell.x
    else if (/^movimenta/i.test(t)) movX = cell.x
    else if (/^benefici/i.test(t)) benX = cell.x
    else if (/^valor$/i.test(t)) valorX = cell.x
  }

  if (dataX == null || movX == null || benX == null || valorX == null) return null

  // Limites = pontos médios entre cabeçalhos consecutivos. Isso funciona
  // mesmo com valores alinhados à direita (coluna "Valor").
  return {
    data: -Infinity,
    mov: (dataX + movX) / 2,
    ben: (movX + benX) / 2,
    valor: (benX + valorX) / 2,
  }
}

/** O documento tem cara de fatura de cartão? */
export function looksLikeFatura(pages: PdfPage[]): boolean {
  return pages.some((p) => {
    if (!/despesas da fatura|fatura atual/i.test(p.text)) return false
    return p.rows.some((row) => detectHeaderRow(row) !== null)
  })
}

/**
 * Lê o primeiro valor monetário de uma célula. Alguns layouts juntam duas
 * colunas de valor ("R$ 96,30" + "USD 17,14"); nesse caso vale o primeiro.
 */
function parseFirstMoney(text: string) {
  const re = /(?:R\$\s*)?[-+]?\s*\(?\s*(?:\d{1,3}(?:[.,]\d{3})+|\d+)[.,]\d{2}\s*\)?(?:\s*[DC]\b)?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const parsed = parseMoneyToken(m[0])
    if (parsed) return parsed
  }
  return parseMoneyToken(text)
}

/** Divide os trechos de uma linha entre as colunas da tabela. */
function splitByColumns(cells: PdfCell[], b: ColumnBounds) {
  const out = { data: '', mov: '', ben: '', valor: '' }
  for (const cell of cells) {
    const t = cell.text.trim()
    if (!t) continue
    if (cell.x < b.mov) out.data = out.data ? `${out.data} ${t}` : t
    else if (cell.x < b.ben) out.mov = out.mov ? `${out.mov} ${t}` : t
    else if (cell.x < b.valor) out.ben = out.ben ? `${out.ben} ${t}` : t
    else out.valor = out.valor ? `${out.valor} ${t}` : t
  }
  return out
}

// --- Montagem das transações ------------------------------------------------

interface Draft {
  date: string
  movLines: string[]
  ben: string | null
  amount: number | null
  negative: boolean
  currency: { amount: number; code: string } | null
}

/** Descrições genéricas do banco que não servem como estabelecimento. */
const GENERIC_MOVEMENT = /^(pix|iof|cred\s*p?\.?\s*parcelado|compra|transferencia)/i

function finalize(draft: Draft | null): RawTransaction | null {
  if (!draft || !draft.date || draft.amount == null) return null

  const movLines = draft.movLines.filter(Boolean)
  const installment =
    movLines.map((l) => parseInstallmentMarker(l)).find((x) => x != null) ?? undefined

  // Linhas de informação de moeda estrangeira não fazem parte da descrição.
  const cleanLines = movLines
    .filter(
      (l) =>
        !/moeda de origem|d[óo]lar americano/i.test(l) &&
        !/^\(?\s*parcela\s*\d+/i.test(l) &&
        !/principal\s*\(r\$|^\)?\s*\+\s*juros/i.test(l),
    )
    // Tira o marcador de parcela do texto ("... (Parcela 03 de 04)").
    .map((l) => l.replace(/\(?\s*\bparcela\s*\d{1,2}\s*(?:de|\/)\s*\d{1,2}\s*\)?/gi, ' '))

  let movText = cleanLines.join(' ').replace(/\s+/g, ' ').trim()
  const ben = draft.ben && draft.ben !== '-' ? draft.ben.replace(/\s+/g, ' ').trim() : null

  // O PDF do Inter quebra "PARCELADO" em "P ARCELADO": comparamos sem espaços.
  const flat = movText.replace(/\s+/g, '')

  // Compra no crédito parcelada: o estabelecimento real vem do beneficiário.
  const isCredit = /^pixcred/i.test(flat) && /parcelad/i.test(flat)
  const isIof = /^iof/i.test(flat)

  let description = movText
  let merchant: string | undefined
  // A categorização usa o nome canônico do estabelecimento (ex.: "Uber",
  // "99pop"), e não o texto cru do extrato.
  let categoryHint = normalizeDescription(description)

  if (isCredit) {
    description = ben ?? 'Compra no crédito parcelada'
    merchant = ben ?? 'Pix no crédito'
    categoryHint = 'pix enviado no credito'
  } else if (GENERIC_MOVEMENT.test(movText) && ben) {
    description = ben
    merchant = ben
  }

  if (isIof) {
    categoryHint = 'iof tarifa'
    if (!ben) {
      description = /parcelad/i.test(flat) ? 'IOF sobre compra parcelada' : movText
      merchant = 'IOF'
    }
  }

  // Linhas "Principal (R$ 14,37) + Juros (R$ 4,81)".
  const jurosLine = movLines.find((l) => /juros/i.test(l))
  const juros = jurosLine ? (jurosLine.match(/juros\s*\(r\$\s*([\d.,]+)\)/i)?.[1] ?? null) : null
  if (juros) {
    categoryHint = `${categoryHint} juros`
  }

  const original = draft.currency

  return {
    date: draft.date,
    description: description || movText || 'Sem descrição',
    amount: draft.amount,
    type: draft.negative ? 'entrada' : 'saida',
    merchant,
    categoryHint,
    creditInstallment: isCredit,
    installment,
    originalAmount: original?.amount,
    originalCurrency: original?.code,
  }
}

/** Extrai as transações de uma fatura (todas as páginas). */
export function parseFatura(pages: PdfPage[]): {
  transactions: RawTransaction[]
  pending: PendingInstallment[]
} {
  const transactions: RawTransaction[] = []
  const pending: PendingInstallment[] = []

  for (const page of pages) {
    // ---- Tabela de despesas -------------------------------------------------
    // Uma página pode ter vários cartões (cada um com seu próprio cabeçalho).
    let draft: Draft | null = null
    let inBlock = false
    let bounds: ColumnBounds | null = null

    const flush = () => {
      const tx = finalize(draft)
      if (tx) transactions.push(tx)
      draft = null
    }

    for (const row of page.rows) {
      // Cabeçalho de tabela: (re)inicia o bloco de despesas.
      const header = detectHeaderRow(row)
      if (header) {
        flush()
        bounds = header
        inBlock = false
        continue
      }
      if (!bounds) continue

      const cols = splitByColumns(row.cells, bounds)

      if (cols.data) {
        const date = parseFaturaDate(cols.data)
        if (date) {
          flush()
          inBlock = true
          draft = {
            date,
            movLines: [],
            ben: null,
            amount: null,
            negative: false,
            currency: null,
          }
        } else if (/^total/i.test(cols.data)) {
          // "Total CARTÃO ..." — fim do bloco de despesas.
          flush()
          inBlock = false
          continue
        } else {
          continue // cabeçalho de cartão, avisos etc.
        }
      }

      if (!inBlock || !draft) continue

      if (cols.mov) draft.movLines.push(cols.mov)
      if (cols.ben && cols.ben !== '-' && !draft.ben) draft.ben = cols.ben

      // Conversão de moeda informada pelo banco (ex.: 17,14 USD).
      const orig = cols.mov?.match(/moeda de origem:\s*([\d.,]+)\s*([A-Za-z]{3})/i)
      if (orig) {
        const value = parseMoneyToken(orig[1])
        if (value) {
          draft.currency = { amount: value.value, code: orig[2].toUpperCase() }
        }
      }

      // O primeiro valor da transação é o valor cobrado. Linhas de total,
      // saldo ou continuação (ex.: valor em USD) não podem sobrescrevê-lo.
      if (cols.valor && draft.amount == null) {
        const summary =
          /^(total|subtotal|saldo|limite|resumo)\b/i.test(cols.ben || '') ||
          /^(total|subtotal|saldo|limite|resumo)\b/i.test(cols.mov || '')
        if (!summary) {
          const parsed = parseFirstMoney(cols.valor)
          if (parsed) {
            draft.amount = parsed.value
            draft.negative = parsed.negative
          }
        }
      }
    }
    flush()

    // ---- Seção "próxima fatura" (parcelas a cobrar) --------------------------
    pending.push(...parsePendingSection(page))
  }

  return { transactions, pending }
}

/**
 * Lê a seção "Próxima fatura": tabela de duas colunas (Movimentação | Valor)
 * com as parcelas que ainda serão cobradas.
 */
function parsePendingSection(page: PdfPage): PendingInstallment[] {
  if (!/pr[óo]xima fatura|saldo em aberto|compras parceladas/i.test(page.text)) return []

  // Cabeçalho de duas colunas: "Movimentação | Valor" (sem "Data").
  let header: { rowIndex: number; valorMinX: number; minX: number } | null = null
  for (let i = 0; i < page.rows.length; i++) {
    const row = page.rows[i]
    let movX: number | null = null
    let valorX: number | null = null
    let hasData = false
    for (const cell of row.cells) {
      const t = cell.text.trim()
      if (/^data$/i.test(t)) hasData = true
      else if (/^movimenta/i.test(t)) movX = cell.x
      else if (/^valor$/i.test(t)) valorX = cell.x
    }
    if (hasData || movX == null || valorX == null) continue
    // A coluna "Valor" é alinhada à direita: os valores começam perto do fim.
    header = { rowIndex: i, valorMinX: valorX - 20, minX: movX - 30 }
    break
  }
  if (!header) return []

  const chunks: string[] = []
  const values: number[] = []

  for (let i = header.rowIndex + 1; i < page.rows.length; i++) {
    const movParts: string[] = []
    let valorText = ''
    for (const cell of page.rows[i].cells) {
      const t = cell.text.trim()
      if (!t) continue
      // A tabela de parcelas fica na metade direita da página: ignora a coluna
      // da esquerda (limite de crédito, "Utilizado/Disponível", etc.).
      if (cell.x < header.minX) continue
      if (cell.x < header.valorMinX) movParts.push(t)
      else valorText = valorText ? `${valorText} ${t}` : t
    }
    const mov = movParts.join(' ').trim()
    if (!mov && !valorText) continue
    if (/^saldo/i.test(mov)) break // fim da lista de parcelas
    if (mov) chunks.push(mov)
    // Só associa valor à linha que também tem descrição. Linhas apenas com
    // valor (ex.: total) desalinhavam a lista de parcelas.
    if (valorText && mov) {
      const parsed = parseMoneyToken(valorText)
      if (parsed) values.push(parsed.value)
    }
  }

  if (!chunks.length) return []

  // Reagrupa os trechos em "estabelecimento + (Parcela X de Y)".
  const joined = chunks.join(' ')
  const re = /(.+?)\s*\(?\s*parcela\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})\s*\)?/gi
  const out: PendingInstallment[] = []
  let match: RegExpExecArray | null
  let index = 0
  while ((match = re.exec(joined)) !== null && index < values.length) {
    const description = match[1].replace(/\s+/g, ' ').trim()
    const current = parseInt(match[2], 10)
    const total = parseInt(match[3], 10)
    const amount = values[index]
    index += 1
    if (!description || !amount) continue
    out.push({ description, current, total, amount })
  }

  return out
}
