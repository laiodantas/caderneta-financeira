// ============================================================================
// Extração de transações a partir de TEXTO bruto (núcleo dos parsers)
// ----------------------------------------------------------------------------
// Heurísticas razoavelmente tolerantes para extratos brasileiros:
//   - data dd/mm/aaaa (ou dd/mm) no início ou no meio da linha;
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
  // Fatura de cartão: parcelamento da fatura, encargos e boleto.
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

interface MoneyMatch {
  index: number
  raw: string
  value: number
  negative: boolean
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
  } else if (/^\d+$/.test(s)) {
    value = parseInt(s, 10) / 100 // valor sem centavos, ex.: "2500" → 25,00
  }

  if (value == null || Number.isNaN(value)) return null
  return { value: Math.abs(value), negative }
}

/** Encontra todas as ocorrências de valores monetários na linha. */
function findMoneyTokens(line: string): MoneyMatch[] {
  const results: MoneyMatch[] = []
  // Padrão com R$ opcional, sinal opcional, milhar/décimal.
  const re = /(?:R\$\s*)?[-+]?\s*(?:\(?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\s*\)?|\d+[.,]\d{2}\b|\d{4,}\b)(?:\s*[DC]\b)?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    const parsed = parseMoneyToken(m[0])
    if (parsed) {
      results.push({ index: m.index, raw: m[0], value: parsed.value, negative: parsed.negative })
    }
  }
  return results
}

/** Extrai uma data dd/mm/aaaa, dd/mm ou "03 de jul. 2026"; retorna ISO ou null. */
function extractDate(segment: string): string | null {
  // Formato por extenso: "03 de jul. 2026".
  const ext = segment.match(/(\d{1,2})\s+de\s+([a-zç]{3,4})\.?(?:\s+de)?\s*(\d{4})/i)
  if (ext) {
    const months: Record<string, number> = {
      jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
      jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
    }
    const day = parseInt(ext[1], 10)
    const month = months[ext[2].slice(0, 3).toLowerCase()]
    const year = parseInt(ext[3], 10)
    if (!month || day < 1 || day > 31) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const m = segment.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/)
  if (!m) return null
  let day = parseInt(m[1], 10)
  let month = parseInt(m[2], 10)
  let year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear()
  if (year < 100) year += 2000
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Extrai transações de um bloco de texto. */
export function extractFromText(text: string, fallbackDate?: string): RawTransaction[] {
  const lines = text.replace(/\r/g, '').split('\n')
  const result: RawTransaction[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.length < 8) continue
    if (NOISE.some((re) => re.test(line))) continue

    const tokens = findMoneyTokens(line)
    if (!tokens.length) continue

    // O valor da transação é o ÚLTIMO valor monetário da linha.
    const money = tokens[tokens.length - 1]
    const value = money.value

    // Descrição = trecho antes do valor (removendo a data do início).
    let desc = line.slice(0, money.index).trim()

    // Tenta data no início da descrição.
    let date = extractDate(desc)
    if (date) {
      desc = desc
        .replace(/^\d{1,2}\s+de\s+[a-zç]{3,4}\.?(?:\s+de)?\s*\d{4}/i, '')
        .replace(/^\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?/, '')
        .trim()
    } else {
      // Tenta data em qualquer lugar da descrição.
      const anywhere = desc.match(/\d{1,2}\s+de\s+[a-zç]{3,4}\.?(?:\s+de)?\s*\d{4}|\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?/i)
      if (anywhere) {
        date = extractDate(anywhere[0])
        desc = desc.replace(anywhere[0], ' ').trim()
      } else {
        date = fallbackDate ?? ''
      }
    }

    // Parcelamento: "(Parcela 03 de 04)" sai da descrição e vira metadado.
    const installmentMatch = desc.match(/\(?\s*parcela\s+(\d{1,2})\s+de\s+(\d{1,2})\s*\)?/i)
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
    if (!desc) continue

    // Determina direção.
    const isEntradaKeyword = ENTRADA_KEYWORDS.some((k) => desc.toLowerCase().includes(k))
    let type: 'entrada' | 'saida'
    if (money.negative) type = 'saida'
    else if (/C\b/i.test(money.raw)) type = 'entrada'
    else type = isEntradaKeyword ? 'entrada' : 'saida'

    result.push({
      date: date ?? fallbackDate ?? '',
      description: desc,
      amount: value,
      type,
      installment,
    })
  }

  return result
}
