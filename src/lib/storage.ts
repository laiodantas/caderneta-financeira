import type { Statement, Transaction, LearnedRule, BudgetMap } from '../types'
import { normalizeBudgetMap } from './budget'
import { parseDateText } from './parser/text'

export interface Snapshot {
  version: 2
  statements: Statement[]
  transactions: Transaction[]
  rules: LearnedRule[]
  budgets: BudgetMap
}
const KEY = 'caderneta:snapshot'
let notice = ''
let blocked = false
export function storageNotice() {
  return notice
}
function announce(message: string) {
  notice = message
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('caderneta:storage'))
}
function validDate(date: unknown): boolean {
  return (
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && parseDateText(date) === date
  )
}
export function validateSnapshot(raw: unknown): Snapshot {
  if (!raw || typeof raw !== 'object') throw new Error('Backup inválido.')
  const data = raw as Snapshot
  if (
    data.version !== 2 ||
    !Array.isArray(data.statements) ||
    !Array.isArray(data.transactions) ||
    !Array.isArray(data.rules)
  )
    throw new Error('Formato de backup inválido.')
  const statements = data.statements
  if (
    !statements.every(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        typeof s.label === 'string' &&
        typeof s.bank === 'string' &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(s.period) &&
        (!s.pendingInstallments ||
          (Array.isArray(s.pendingInstallments) &&
            s.pendingInstallments.every(
              (p) =>
                p &&
                typeof p.description === 'string' &&
                Number.isFinite(p.amount) &&
                p.amount > 0 &&
                Number.isInteger(p.current) &&
                p.current > 0 &&
                p.current <= p.total &&
                Number.isInteger(p.total),
            ))),
    )
  )
    throw new Error('Extratos inválidos.')
  const ids = new Set(statements.map((s) => s.id))
  if (ids.size !== statements.length) throw new Error('Extratos duplicados no backup.')
  if (
    !data.transactions.every(
      (t) =>
        t &&
        typeof t.id === 'string' &&
        ids.has(t.statementId) &&
        validDate(t.date) &&
        typeof t.description === 'string' &&
        typeof t.merchant === 'string' &&
        typeof t.category === 'string' &&
        Number.isFinite(t.amount) &&
        t.amount > 0 &&
        ['entrada', 'saida'].includes(t.type) &&
        (t.bank === undefined || typeof t.bank === 'string') &&
        (t.originalCurrency === undefined || typeof t.originalCurrency === 'string') &&
        (t.originalAmount === undefined ||
          (Number.isFinite(t.originalAmount) && t.originalAmount >= 0)) &&
        (t.installmentPlanId === undefined || typeof t.installmentPlanId === 'string') &&
        (t.status === undefined || ['essencial', 'superflua', 'ignorar'].includes(t.status)) &&
        Array.isArray(t.tags) &&
        t.tags.every((tag) => typeof tag === 'string') &&
        (!t.installment ||
          (Number.isInteger(t.installment.current) &&
            Number.isInteger(t.installment.total) &&
            t.installment.current > 0 &&
            t.installment.current <= t.installment.total)),
    )
  )
    throw new Error('Lançamentos inválidos. Os dados originais foram preservados.')
  if (new Set(data.transactions.map((t) => t.id)).size !== data.transactions.length)
    throw new Error('Lançamentos duplicados no backup.')
  if (
    !data.rules.every(
      (r) =>
        r &&
        typeof r.id === 'string' &&
        typeof r.pattern === 'string' &&
        typeof r.categoryId === 'string',
    )
  )
    throw new Error('Regras inválidas.')
  return { ...data, budgets: normalizeBudgetMap(data.budgets) }
}
function readSnapshot(): Snapshot {
  const empty: Snapshot = { version: 2, statements: [], transactions: [], rules: [], budgets: {} }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return validateSnapshot(JSON.parse(raw))
    const legacy = (key: string, fallback: unknown) =>
      JSON.parse(localStorage.getItem('caderneta:' + key) ?? JSON.stringify(fallback))
    return validateSnapshot({
      version: 2,
      statements: legacy('statements', []),
      transactions: legacy('transactions', []),
      rules: legacy('rules', []),
      budgets: legacy('budgets', {}),
    })
  } catch {
    blocked = true
    announce(
      'Não foi possível carregar os dados locais. Eles foram preservados. Exporte uma cópia de recuperação antes de restaurar um backup ou limpar os dados.',
    )
    return empty
  }
}
export function saveSnapshot(data: Snapshot, restoring = false): void {
  if (blocked && !restoring) throw new Error(notice)
  try {
    const validated = validateSnapshot(data)
    localStorage.setItem(KEY, JSON.stringify(validated))
    blocked = false
    announce('')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha de armazenamento'
    announce(
      'Não foi possível salvar: ' + message + '. Exporte um backup antes de fechar esta página.',
    )
    throw new Error(notice)
  }
}
export function loadStatements() {
  return readSnapshot().statements
}
export function loadTransactions() {
  return readSnapshot().transactions
}
export function loadRules() {
  return readSnapshot().rules
}
export function loadBudgets() {
  return readSnapshot().budgets
}
export function recoveryCopy() {
  return Object.fromEntries(
    Object.keys(localStorage)
      .filter((k) => k.startsWith('caderneta:'))
      .map((k) => [k, localStorage.getItem(k)]),
  )
}
export function clearAllData() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('caderneta:'))
    .forEach((k) => localStorage.removeItem(k))
  blocked = false
  announce('')
}

if (typeof window !== 'undefined')
  window.addEventListener('storage', (event) => {
    if (event.key === KEY) {
      blocked = true
      announce(
        'Os dados foram alterados em outra aba. Recarregue a página antes de editar para evitar sobrescrever alterações.',
      )
    }
  })
