// ============================================================================
// Extração de transações a partir de TEXTO bruto (núcleo dos parsers)
// ----------------------------------------------------------------------------
// Heurísticas razoavelmente tolerantes para extratos brasileiros:
//   - data dd/mm/aaaa, dd/mm, dd JUL 2026 ou "03 de julho de 2026";
//   - valor monetário (vírgula ou ponto como decimal) ao final;
//   - sinal: "-", parênteses "()" ou sufixo "D"/"C".
// ============================================================================

import type { RawTransaction } from '../../types'

// Palavras que indicam uma ENTRADA (crédito) mesmo sem sinal explícito.
// Cuidado: termos genéricos como "crédito" foram deixados de fora porque
// aparecem em cobranças de despesa ("IOF CRÉDITO PARCELADO").
const ENTRADA_KEYWORDS = [
  'pix recebido', 'pix recebida', 'recebimento pix', 'pix creditado',
  'deposito', 'depósito', 'salario', 'salário', 'ted recebido', 'doc recebido',
  'estorno', 'rendimento', 'cashback', 'transferencia recebida',
  'transferência recebida', 'pagamento recebido', 'reembolso', 'dividendo',
  'resgate', 'aplicacao', 'aplicação', 'pix entrando', 'pix entrada',
  'entrada creditada', 'credito em conta',
]

// Linhas que claramente NÃO são transações.
const NOISE = [
  /^p[áa]gina\b/i, /^data\b/i, /^descri[çc][ãa]o\b/i, /^hist[óo]rico\b/i,
  /^valor\b/i, /^saldo\b/i, /^extrato\b/i, /^per[íi]odo\b/i, /^total\b/i,
  /^autentica[çc][ãa]o\b/i, /^conta\b/i, /^ag[êe]ncia\b/i, /^lan[çc]amentos?\b/i,
  /^\d+\s+de\s+\d+\s+p[áa]ginas?/i, /^[^a-z0-9]*$/,
  // Fatura de cartão: vencimento, limites, parcelamento e encargos.
  /^vencimento\b/i, /^limite\b/i, /^fatura anterior\b/i, /^resumo\b/i,
  /^parcelamento\b/i, /^encargos?\b/i, /^pagamento m[íi]nimo/i,
  /^iof (di[áa]rio|adicional|internacional)/i, /^multa/i, /^juros de mora/i,
  /^saldo (total|de|em aberto)/i, /^nosso n[úu]mero/i, /^n[ºo°]? ?documento/i,
  /^b[êe]nefici[áa]rio/i, /^local de pagamento/i, /^pagador\b/i,
  /^fale com a gente/i, /^encargos financeiros/i,
  // Opções de parcelamento da fatura: "1 + 2 de R$ 709,49".
  /^\d+\s*\+\s*\d+\s+de R\$/i,
  // Linha de código de barras do boleto.
  /^[\d\s.]{20,}$/,
]

const MONTHS: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
}

// Nomes de mês completos ou abreviados, exigindo fim de palavra para não
// confundir "mar" com "marcenaria" nem "set" com "setor".
const MONTH_PATTERN =
  '(?:jan(?:eiro)?|fev(?:ereiro)?|mar(?:co|ço)?|abr(?:il)?|mai(?:o)?|' +
  'jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|' +
  'nov(?:embro)?|dez(?:embro)?)'

interface MoneyMatch {
  index: number
  raw: string
  value: number
  negative: boolean
}

interface DateMatch {
  iso: string
  raw: string
  index: number
}

/** Tenta interpretar um token como valor monetário BR ou US. */
export function parseMoneyToken(token: string): { value: number; negative: boolean } | null {
  let s = token.trim()

  // Remove "R$".
  s = s.replace(/R\$/gi, '').trim()

  // Detecta parênteses (valor negativo em muitos bancos).
  let negative = false
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true
    s = s.slice(1, -1)
  }

  // Sufixo D (débito) / C (crédito).
  const suffix = s.match(/([DC])\s*$/i)
  if (suffix) {
    if (suffix[1].toUpperCase() === 'D') negative = true
    else if (suffix[1].toUpperCase() === 'C') negative = false
    s = s.replace(/([DC])\s*$/i, '').trim()
  }

  // Sinal explícito.
  if (/^[+-]/.test(s)) {
    if (s.startsWith('-')) negative = true
    s = s.replace(/^[+-]/, '').trim()
  }

  // Normaliza: BR "1.234,56" ou US "1,234.56" → número.
  s = s.replace(/\s/g, '')
  let value: number | null = null

  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(s)) {
    // Formato brasileiro: pontos = milhar, vírgula = decimal.
    value = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  } else if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(s)) {
    // Formato americano.
    value = parseFloat(s.replace(/,/g, ''))
  } else if (/^\d+,\d{2}$/.test(s)) {
    value = parseFloat(s.replace(',', '.'))
  } else if (/^\d+\.\d{2}$/.test(s)) {
    value = parseFloat(s)
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Milhar sem centavos: "1.234" → 1234.
    value = parseFloat(s.replace(/\./g, ''))
  } else if (/^\d+$/.test(s)) {
    // Valor inteiro. Em extratos brasileiros "2500" significa R$ 2.500,00,
    // e não R$ 25,00.
    value = parseFloat(s)
  }

  if (value == null || Number.isNaN(value)) return null
  return { value: Math.abs(value), negative }
}

/** Encontra todas as ocorrências de valores monetários na linha. */
function findMoneyTokens(line: string): MoneyMatch[] {
  const results: MoneyMatch[] = []
  // Padrão com R$ opcional, sinal opcional, milhar/decimal.
  // Números soltos de 4+ dígitos (anos, códigos, CPF) NÃO entram: antes eles
  // viravam valores como R$ 20,26 a partir de "2026".
  const re = /(?:[-+]\s*)?(?:R\$\s*)?[-+]?\s*(?:\(?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\s*\)?|\d+[.,]\d{2}\b)(?:\s*[DC]\b)?(?!(?:[\d/\-]|[.,]\d))/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    const parsed = parseMoneyToken(m[0])
    if (parsed) {
      results.push({ index: m.index, raw: m[0], value: parsed.value, negative: parsed.negative })
    }
  }
  return results
}

function toISODate(day: number, month: number, year: number): string | null {
  if (day < 1 || month < 1 || month > 12) return null
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day > daysInMonth) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeYear(value: string | undefined, fallbackYear: number): number {
  if (!value) return fallbackYear
  let year = parseInt(value, 10)
  if (year < 100) year += 2000
  return year
}

/**
 * Procura uma data no texto e devolve ISO + trecho encontrado.
 * Aceita "03 de jul. 2026", "03 JUL 2026", "03/07/2026" e "03/07".
 */
function findDateMatch(text: string, fallbackYear: number): DateMatch | null {
  // Formato ISO (yyyy-mm-dd), comum em CSV/OFX e relatórios.
  const isoRe = /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g
  let m: RegExpExecArray | null
  while ((m = isoRe.exec(text)) !== null) {
    const iso = toISODate(parseInt(m[3], 10), parseInt(m[2], 10), parseInt(m[1], 10))
    if (iso) return { iso, raw: m[0], index: m.index }
  }

  const monthRe = new RegExp(
    `(\\d{1,2})\\s*(?:de\\s+)?(${MONTH_PATTERN})\\.?\\s*(?:de\\s+)?(\\d{2,4})?\\b`,
    'gi',
  )

  while ((m = monthRe.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 12), m.index)
    if (/parcela\s*$/i.test(before)) continue

    const day = parseInt(m[1], 10)
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()]
    const year = normalizeYear(m[3], fallbackYear)
    if (!month) continue
    const iso = toISODate(day, month, year)
    if (iso) return { iso, raw: m[0], index: m.index }
  }

  const numericRe = /(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/g
  while ((m = numericRe.exec(text)) !== null) {
    // "Parcela 3/4" não é uma data.
    const before = text.slice(Math.max(0, m.index - 12), m.index)
    if (/parcela\s*$/i.test(before)) continue

    const day = parseInt(m[1], 10)
    const month = parseInt(m[2], 10)
    const year = normalizeYear(m[3], fallbackYear)
    const iso = toISODate(day, month, year)
    if (iso) return { iso, raw: m[0], index: m.index }
  }

  return null
}

/** Converte um texto com data para ISO (`yyyy-mm-dd`) ou null. */
export function parseDateText(text: string, fallbackYear?: number): string | null {
  return findDateMatch(text, fallbackYear ?? new Date().getFullYear())?.iso ?? null
}

export interface ExtractOptions {
  /**
   * Documento é fatura de cartão: valores negativos são créditos/pagamentos
   * (entrada), e não despesas.
   */
  isFatura?: boolean
}

/** Extrai transações de um bloco de texto. */
export function extractFromText(
  text: string,
  fallbackDate?: string,
  options: ExtractOptions = {},
): RawTransaction[] {
  const lines = text.replace(/\r/g, '').split('\n')
  const result: RawTransaction[] = []
  const fallbackYear = fallbackDate
    ? parseInt(fallbackDate.slice(0, 4), 10)
    : new Date().getFullYear()

  // Data do último lançamento reconhecido. Linhas de continuação (IOF,
  // encargos, detalhes de parcelamento) herdam essa data em vez de ficarem
  // sem data nenhuma.
  let lastDate: string | null = fallbackDate ?? null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.length < 8) continue
    if (NOISE.some((re) => re.test(line))) continue

    const tokens = findMoneyTokens(line)
    if (!tokens.length) continue

    // O valor da transação é o ÚLTIMO valor monetário da linha.
    const money = tokens[tokens.length - 1]
    const value = money.value

    // Descrição = trecho antes do valor.
    let desc = line.slice(0, money.index).trim()

    // A data pode estar no início ou no meio da descrição; o trecho é
    // removido para não sujar o nome do estabelecimento.
    const found = findDateMatch(desc, fallbackYear)
    let date: string
    if (found) {
      date = found.iso
      desc = `${desc.slice(0, found.index)} ${desc.slice(found.index + found.raw.length)}`
        .replace(/\s+/g, ' ')
        .trim()
      lastDate = date
    } else {
      date = lastDate ?? ''
    }

    // Parcelamento: "(Parcela 03 de 04)" sai da descrição e vira metadado.
    const installmentMatch = desc.match(/\bparcela\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})\b/i)
    let installment: { current: number; total: number } | undefined
    if (installmentMatch) {
      const current = parseInt(installmentMatch[1], 10)
      const total = parseInt(installmentMatch[2], 10)
      if (current && total && current <= total) {
        installment = { current, total }
        desc = desc.replace(installmentMatch[0], ' ').replace(/\s+/g, ' ').trim()
      }
    }

    // Remove sufixo "D"/"C" que sobrou no começo/meio e lixo de borda.
    desc = desc.replace(/^[|:\-\s]+|[|:\-\s]+$/g, '').trim()
    // Linha só com "Parcela 3/4" ainda é uma despesa: não pode ser
    // descartada por falta de nome do estabelecimento.
    if (!desc && installment) desc = 'Compra parcelada'
    if (!desc) continue

    // Determina direção.
    const isEntradaKeyword = ENTRADA_KEYWORDS.some((k) => desc.toLowerCase().includes(k))
    let type: 'entrada' | 'saida'
    if (money.negative) type = options.isFatura ? 'entrada' : 'saida'
    else if (/C\b/i.test(money.raw)) type = 'entrada'
    else type = isEntradaKeyword ? 'entrada' : 'saida'

    result.push({
      date: date || fallbackDate || '',
      description: desc,
      amount: value,
      type,
      installment,
    })
  }

  return result
}
