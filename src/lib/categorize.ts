// ============================================================================
// Categorização automática (com regras aprendidas)
// ----------------------------------------------------------------------------
// Ordem de prioridade:
//   1. Regras aprendidas pelo usuário (substring normalizada → categoria).
//   2. Palavras-chave de cada categoria (ver config/categories.ts).
//   3. Categoria "Extras / Outros" como fallback.
// ============================================================================

import { CATEGORIES, DEFAULT_CATEGORY } from '../config/categories'
import { normalizeForMatch, normalizeDescription } from './normalize'
import { uid } from './format'
import type { LearnedRule, RawTransaction, Transaction } from '../types'

/** Aplica regras aprendidas; retorna o id da categoria ou null. */
function matchLearned(descNormalized: string, rules: LearnedRule[]): string | null {
  for (const rule of rules) {
    if (!rule.pattern) continue
    // Regras são armazenadas como substring normalizada.
    if (descNormalized.includes(normalizeForMatch(rule.pattern))) {
      return rule.categoryId
    }
  }
  return null
}

/**
 * Expressão que casa a palavra-chave como palavra inteira.
 * (O marcador de espaço no final das palavras-chave é perdido na
 * normalização, então a fronteira é reconstruída aqui.)
 */
function wordRegex(keyword: string): RegExp {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}(s|es)?([^a-z0-9]|$)`)
}

/** Aplica palavras-chave; retorna o id da categoria ou null. */
function matchKeywords(descNormalized: string): string | null {
  for (const cat of CATEGORIES) {
    if (!cat.keywords.length) continue
    for (const kw of cat.keywords) {
      const k = normalizeForMatch(kw)
      if (!k) continue
      // Palavra-chave escrita com espaço no final = fronteira de palavra
      // (ex.: "oba " não pode casar com "global").
      if (/\s$/.test(kw)) {
        if (wordRegex(k).test(descNormalized)) return cat.id
      } else if (descNormalized.includes(k)) {
        return cat.id
      }
    }
  }
  return null
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
): string {
  const normalized = normalizeForMatch(description)
  if (!normalized) return DEFAULT_CATEGORY

  const learned = matchLearned(normalized, rules)
  if (learned) return learned

  const kw = matchKeywords(normalizeForMatch(hint || normalizeDescription(description)))
  if (kw) return kw

  return DEFAULT_CATEGORY
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
  const category = categorize(raw.description, rules, raw.categoryHint)

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
