// ============================================================================
// Categorização automática (com regras aprendidas)
// ----------------------------------------------------------------------------
// Ordem de prioridade:
//   1. Regras aprendidas pelo usuário (substring normalizada → categoria).
//   2. Palavras-chave de cada categoria (ver config/categories.ts).
//   3. Categoria "Extras / Outros" como fallback.
// ============================================================================

import { CATEGORY_KEYWORDS, DEFAULT_CATEGORY } from '../config/categories'
import { normalizeForMatch, normalizeDescription } from './normalize'
import { uid } from './format'
import type { LearnedRule, RawTransaction, Transaction, TransactionType } from '../types'

/** Escapa um texto para uso dentro de uma expressão regular. */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Aplica regras aprendidas; retorna o id da categoria ou null. */
function matchLearned(descNormalized: string, rules: LearnedRule[]): string | null {
  for (const rule of [...rules].reverse()) {
    const pattern = normalizeForMatch(rule.pattern)
    if (!pattern) continue

    // Regras curtas ("show", "loja") exigem palavra inteira, para não
    // capturar "shopping" ou "lojista" por acidente.
    if (!pattern.includes(' ') && pattern.length <= 4) {
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(pattern)}([^a-z0-9]|$)`)
      if (re.test(descNormalized)) return rule.categoryId
    } else if (descNormalized.includes(pattern)) {
      return rule.categoryId
    }
  }
  return null
}

interface KeywordHit {
  categoryId: string
  /** Quanto maior, mais específica é a palavra-chave. */
  score: number
}

/**
 * Casa a palavra-chave no texto. Quando ela termina com espaço na configuração,
 * exige palavra inteira ("bar " não casa com "barbearia").
 */
function keywordMatches(text: string, keyword: string, wholeWord: boolean): boolean {
  if (!wholeWord) return text.includes(keyword)
  const escaped = escapeRegex(keyword).replace(/\s+/g, '\\s+')
  return new RegExp(`(^|[^a-z0-9])${escaped}(s|es)?([^a-z0-9]|$)`).test(text)
}

/**
 * Procura a palavra-chave mais específica do texto.
 * A mais longa vence (expressões de duas palavras ganham prioridade), em vez
 * de a primeira categoria da lista vencer. Isso evita que termos genéricos
 * como "mercado" capturem "Mercado Livre" ou que "show" capture "shopping".
 */
function bestKeywordMatch(text: string): KeywordHit | null {
  let best: KeywordHit | null = null

  // Lista já normalizada e sem duplicatas de acento (ver config/categories.ts).
  for (const { categoryId, keyword, wholeWord } of CATEGORY_KEYWORDS) {
    if (!keywordMatches(text, keyword, wholeWord)) continue

    // Expressões de duas palavras vencem; depois, a palavra mais longa.
    // A fronteira de palavra só desempata levemente: "bar" não pode vencer
    // "restaurante" em "O bar e restaurante".
    const multiWord = keyword.includes(' ')
    const score = keyword.length + (multiWord ? 20 : 0) + (wholeWord ? 2 : 0)
    if (!best || score > best.score) {
      best = { categoryId, score }
    }
  }

  return best
}

/**
 * Classifica uma descrição crua.
 * `rules` são as regras aprendidas pelo usuário.
 * `hint` é o texto usado na busca por palavras-chave (padrão: o nome
 * canônico do estabelecimento, ex.: "Uber", "99pop", "iFood").
 */
export function categorize(
  description: string,
  rules: LearnedRule[] = [],
  hint?: string,
  type?: TransactionType,
): string {
  const normalized = normalizeForMatch(description)
  // A descrição e o nome canônico do estabelecimento são avaliados juntos;
  // a melhor correspondência entre os dois vence.
  const hintNormalized = normalizeForMatch(hint || normalizeDescription(description))
  if (!normalized && !hintNormalized) return DEFAULT_CATEGORY

  const learned = normalized ? matchLearned(normalized, rules) : null
  if (learned) return learned

  let best: KeywordHit | null = null
  for (const source of [normalized, hintNormalized]) {
    if (!source) continue
    const hit = bestKeywordMatch(source)
    if (hit && (!best || hit.score > best.score)) best = hit
  }
  if (best) return best.categoryId

  // Sem palavra-chave: usa o tipo do lançamento para diferenciar PIX e
  // transferências, em vez de mandar tudo para "Extras".
  if (/(^|[^a-z0-9])pix([^a-z0-9]|$)/.test(normalized)) {
    return type === 'entrada' ? 'pix_recebido' : 'pix_enviado'
  }
  if (/(^|[^a-z0-9])(ted|doc|transferencia)([^a-z0-9]|$)/.test(normalized)) {
    return 'transferencias'
  }

  // Entrada sem nenhuma pista vai para "Renda", não para "Extras" (que é para gastos).
  return type === 'entrada' ? 'renda' : DEFAULT_CATEGORY
}

/**
 * Recalcula a categoria de um lançamento já salvo, usando as regras atuais.
 * Usa o nome do estabelecimento (e não o texto cru) e preserva a identificação
 * de "Pix no crédito", que depende de uma tag, não da descrição.
 */
export function categoryForSaved(tx: Transaction, rules: LearnedRule[]): string {
  const pixCredit = tx.tags.includes('Pix no crédito')
  const hint = pixCredit ? 'pix enviado no credito' : tx.merchant
  return categorize(tx.description, rules, hint, tx.type)
}

/**
 * Gera uma regra aprendida a partir de uma correção do usuário.
 * Usa a parte "estável" da descrição (sem números) como padrão.
 */
export function buildRuleFrom(description: string, categoryId: string): LearnedRule {
  // Remove dígitos e símbolos para capturar a "essência" da descrição.
  const pattern = normalizeForMatch(description)
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)

  return {
    id: `${categoryId}:${pattern}`,
    pattern,
    categoryId,
    createdAt: new Date().toISOString(),
  }
}

/** Converte uma transação crua em uma transação normalizada + categorizada. */
export function rawToTransaction(
  raw: RawTransaction,
  statementId: string,
  bank: string | undefined,
  rules: LearnedRule[],
): Transaction {
  const merchant = raw.merchant ?? normalizeDescription(raw.description)
  const category = categorize(raw.description, rules, raw.categoryHint, raw.type)

  // Tags automáticas que ajudam a identificar o tipo de lançamento.
  const tags: string[] = []
  if (raw.installment) {
    tags.push(`Parcela ${raw.installment.current}/${raw.installment.total}`)
  }
  if (raw.creditInstallment) {
    tags.push('Pix no crédito')
  }
  if (raw.originalCurrency) {
    tags.push(`Moeda original: ${raw.originalCurrency}`)
  }

  return {
    id: uid(),
    date: raw.date,
    description: raw.description,
    merchant,
    amount: raw.amount,
    type: raw.type,
    category,
    statementId,
    bank,
    tags,
    installment: raw.installment,
    originalAmount: raw.originalAmount,
    originalCurrency: raw.originalCurrency,
  }
}
