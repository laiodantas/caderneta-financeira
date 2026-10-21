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

/** Aplica palavras-chave; retorna o id da categoria ou null. */
function matchKeywords(descNormalized: string): string | null {
  for (const cat of CATEGORIES) {
    if (!cat.keywords.length) continue
    for (const kw of cat.keywords) {
      const k = normalizeForMatch(kw)
      if (!k) continue
      // Palavra-chave com espaço no final indica fronteira de palavra.
      if (k.endsWith(' ')) {
        if (descNormalized === k.trim() || descNormalized.startsWith(k)) return cat.id
        if (descNormalized.includes(` ${k.trim()}`)) return cat.id
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
 */
export function categorize(description: string, rules: LearnedRule[] = []): string {
  const normalized = normalizeForMatch(description)
  if (!normalized) return DEFAULT_CATEGORY

  const learned = matchLearned(normalized, rules)
  if (learned) return learned

  const kw = matchKeywords(normalized)
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
  const merchant = normalizeDescription(raw.description)
  const category = categorize(raw.description, rules)
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
    tags: [],
  }
}
