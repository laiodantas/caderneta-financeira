// ============================================================================
// Persistência local (localStorage)
// ----------------------------------------------------------------------------
// Tudo fica no navegador do usuário — nenhum dado bancário sai da máquina.
// ============================================================================

import type { Statement, Transaction, LearnedRule, BudgetMap } from '../types'
import { normalizeBudgetMap } from './budget'

const KEYS = {
  version: 'caderneta:version',
  statements: 'caderneta:statements',
  transactions: 'caderneta:transactions',
  rules: 'caderneta:rules',
  budgets: 'caderneta:budgets',
  settings: 'caderneta:settings',
} as const

const VERSION = '1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('Falha ao salvar no navegador:', err)
  }
}

export function loadStatements(): Statement[] {
  return read<Statement[]>(KEYS.statements, [])
}

export function saveStatements(items: Statement[]): void {
  write(KEYS.statements, items)
}

export function loadTransactions(): Transaction[] {
  return read<Transaction[]>(KEYS.transactions, [])
}

export function saveTransactions(items: Transaction[]): void {
  write(KEYS.transactions, items)
}

export function loadRules(): LearnedRule[] {
  return read<LearnedRule[]>(KEYS.rules, [])
}

export function saveRules(items: LearnedRule[]): void {
  write(KEYS.rules, items)
}

export function loadBudgets(): BudgetMap {
  // Migra automaticamente o formato antigo ({ transporte: 500 }).
  return normalizeBudgetMap(read<unknown>(KEYS.budgets, {}))
}

export function saveBudgets(items: BudgetMap): void {
  write(KEYS.budgets, items)
}

export interface Settings {
  /** Se o usuário já leu o aviso de privacidade. */
  privacyAcknowledged: boolean
}

export function loadSettings(): Settings {
  return read<Settings>(KEYS.settings, { privacyAcknowledged: false })
}

export function saveSettings(s: Settings): void {
  write(KEYS.settings, s)
}

/** Remove TODOS os dados da caderneta (ação destrutiva, sempre confirmada). */
export function clearAllData(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
}
