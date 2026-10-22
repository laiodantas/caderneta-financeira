// ============================================================================
// Contexto global de estado da Caderneta Financeira
// ----------------------------------------------------------------------------
// Carrega dados do localStorage e expõe ações (importar, editar, categorizar,
// regras, orçamentos, limpar, dados de exemplo).
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Statement,
  Transaction,
  LearnedRule,
  BudgetMap,
  PendingInstallment,
} from '../types'
import {
  loadStatements,
  saveStatements,
  loadTransactions,
  saveTransactions,
  loadRules,
  saveRules,
  loadBudgets,
  saveBudgets,
  clearAllData,
} from '../lib/storage'
import { buildRuleFrom, categoryForSaved } from '../lib/categorize'
import { cleanImportArtifacts } from '../lib/normalize'
import { generateSampleData } from '../lib/sample'
import { uid } from '../lib/format'

export interface CommitPayload {
  label: string
  bank: string
  period: string
  fileName?: string
  transactions: Transaction[]
  /** Parcelas que serão cobradas em faturas futuras. */
  pendingInstallments?: PendingInstallment[]
}

interface FinanceContextValue {
  statements: Statement[]
  transactions: Transaction[]
  rules: LearnedRule[]
  budgets: BudgetMap

  commitImport: (payload: CommitPayload) => Statement
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  recategorizeTransaction: (id: string, categoryId: string, learn: boolean) => void
  /** Limpa nomes e reaplica as regras de categoria. Retorna quantos lançamentos mudaram. */
  reapplyCategories: () => number
  addRule: (pattern: string, categoryId: string) => void
  deleteRule: (id: string) => void
  setBudget: (categoryId: string, amount: number, period?: string) => void
  /**
   * Remove o valor próprio: do mês informado (`period`) ou o padrão da
   * categoria (sem `period`). Depois disso vale novamente o padrão.
   */
  clearBudget: (categoryId: string, period?: string) => void
  deleteStatement: (id: string) => void
  loadSample: () => void
  clearAll: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [statements, setStatements] = useState<Statement[]>(() => loadStatements())
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions())
  const [rules, setRules] = useState<LearnedRule[]>(() => loadRules())
  const [budgets, setBudgets] = useState<BudgetMap>(() => loadBudgets())

  // Persistência automática.
  useEffect(() => saveStatements(statements), [statements])
  useEffect(() => saveTransactions(transactions), [transactions])
  useEffect(() => saveRules(rules), [rules])
  useEffect(() => saveBudgets(budgets), [budgets])

  const commitImport = useCallback(
    (payload: CommitPayload): Statement => {
      const statementId = uid()
      const statement: Statement = {
        id: statementId,
        label: payload.label,
        bank: payload.bank,
        period: payload.period,
        importedAt: new Date().toISOString(),
        transactionCount: payload.transactions.length,
        fileName: payload.fileName,
        pendingInstallments: payload.pendingInstallments,
      }

      // Garante que todas as transações apontem para este extrato.
      const txs = payload.transactions.map((t) => ({ ...t, statementId }))

      setStatements((prev) => [statement, ...prev])
      setTransactions((prev) => [...txs, ...prev])
      return statement
    },
    [],
  )

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /**
   * Atualiza os lançamentos salvos: limpa artefatos de importação nos nomes
   * (ex.: "( )") e reaplica as regras de categoria. Categorias escolhidas
   * manualmente são preservadas. Retorna quantos lançamentos mudaram.
   */
  const reapplyCategories = useCallback((): number => {
    let changed = 0
    const next = transactions.map((t) => {
      const description = cleanImportArtifacts(t.description) || t.description
      const merchant = cleanImportArtifacts(t.merchant) || t.merchant
      const category =
        t.categorySource === 'manual'
          ? t.category
          : categoryForSaved({ ...t, description, merchant }, rules)
      if (description === t.description && merchant === t.merchant && category === t.category) {
        return t
      }
      changed += 1
      return { ...t, description, merchant, category }
    })
    if (changed > 0) setTransactions(next)
    return changed
  }, [transactions, rules])

  const recategorizeTransaction = useCallback(
    (id: string, categoryId: string, learn: boolean) => {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, category: categoryId, categorySource: 'manual' } : t,
        ),
      )
      if (learn) {
        const tx = transactions.find((t) => t.id === id)
        if (tx) {
          const rule = buildRuleFrom(tx.description, categoryId)
          setRules((prev) => {
            const exists = prev.some((r) => r.id === rule.id)
            if (exists) return prev
            return [...prev, rule]
          })
        }
      }
    },
    [transactions],
  )

  const addRule = useCallback((pattern: string, categoryId: string) => {
    const rule = buildRuleFrom(pattern, categoryId)
    setRules((prev) => {
      if (prev.some((r) => r.id === rule.id)) return prev
      return [...prev, rule]
    })
  }, [])

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const setBudget = useCallback(
    (categoryId: string, amount: number, period?: string) => {
      setBudgets((prev) => {
        const current = prev[categoryId] ?? { months: {} }
        if (period) {
          // Valor próprio do mês (não altera os outros meses).
          return {
            ...prev,
            [categoryId]: { ...current, months: { ...current.months, [period]: amount } },
          }
        }
        // Valor padrão, usado por qualquer mês sem valor próprio.
        return { ...prev, [categoryId]: { ...current, base: amount } }
      })
    },
    [],
  )

  const clearBudget = useCallback((categoryId: string, period?: string) => {
    setBudgets((prev) => {
      const current = prev[categoryId]
      if (!current) return prev

      if (period) {
        if (current.months[period] === undefined) return prev
        const months = { ...current.months }
        delete months[period]
        return { ...prev, [categoryId]: { ...current, months } }
      }

      // Remove o padrão. Se não sobrar nenhum mês próprio, apaga a entrada.
      if (Object.keys(current.months).length === 0) {
        const next = { ...prev }
        delete next[categoryId]
        return next
      }
      return { ...prev, [categoryId]: { months: current.months } }
    })
  }, [])

  const deleteStatement = useCallback((id: string) => {
    setStatements((prev) => prev.filter((s) => s.id !== id))
    setTransactions((prev) => prev.filter((t) => t.statementId !== id))
  }, [])

  const loadSample = useCallback(() => {
    const { statements: st, transactions: tx } = generateSampleData()
    // Evita empilhar cópias dos dados de exemplo a cada clique.
    const sampleIds = new Set(
      statements.filter((s) => s.label.startsWith('Demonstração')).map((s) => s.id),
    )
    if (sampleIds.size > 0) {
      const ok = window.confirm(
        'Os dados de exemplo já estão carregados. Deseja recarregá-los? Os lançamentos de exemplo atuais serão substituídos.',
      )
      if (!ok) return
    } else if (transactions.length > 0) {
      const ok = window.confirm(
        'Já existem lançamentos na caderneta. Os dados de exemplo serão adicionados a eles. Deseja continuar?',
      )
      if (!ok) return
    }
    setStatements((prev) => [...st, ...prev.filter((s) => !sampleIds.has(s.id))])
    setTransactions((prev) => [
      ...tx,
      ...prev.filter((t) => !sampleIds.has(t.statementId)),
    ])
  }, [statements, transactions])

  const clearAll = useCallback(() => {
    clearAllData()
    setStatements([])
    setTransactions([])
    setRules([])
    setBudgets({})
  }, [])

  const value = useMemo<FinanceContextValue>(
    () => ({
      statements,
      transactions,
      rules,
      budgets,
      commitImport,
      updateTransaction,
      deleteTransaction,
      recategorizeTransaction,
      reapplyCategories,
      addRule,
      deleteRule,
      setBudget,
      clearBudget,
      deleteStatement,
      loadSample,
      clearAll,
    }),
    [
      statements,
      transactions,
      rules,
      budgets,
      commitImport,
      updateTransaction,
      deleteTransaction,
      recategorizeTransaction,
      reapplyCategories,
      addRule,
      deleteRule,
      setBudget,
      clearBudget,
      deleteStatement,
      loadSample,
      clearAll,
    ],
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance deve ser usado dentro de <FinanceProvider>')
  return ctx
}
