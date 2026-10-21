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
import { buildRuleFrom } from '../lib/categorize'
import { generateSampleData } from '../lib/sample'
import { uid } from '../lib/format'

export interface CommitPayload {
  label: string
  bank: string
  period: string
  fileName?: string
  transactions: Transaction[]
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
  addRule: (pattern: string, categoryId: string) => void
  deleteRule: (id: string) => void
  setBudget: (categoryId: string, amount: number) => void
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

  const recategorizeTransaction = useCallback(
    (id: string, categoryId: string, learn: boolean) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, category: categoryId } : t)),
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

  const setBudget = useCallback((categoryId: string, amount: number) => {
    setBudgets((prev) => ({ ...prev, [categoryId]: amount }))
  }, [])

  const deleteStatement = useCallback((id: string) => {
    setStatements((prev) => prev.filter((s) => s.id !== id))
    setTransactions((prev) => prev.filter((t) => t.statementId !== id))
  }, [])

  const loadSample = useCallback(() => {
    const { statements: st, transactions: tx } = generateSampleData()
    setStatements((prev) => [...st, ...prev])
    setTransactions((prev) => [...tx, ...prev])
  }, [])

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
      addRule,
      deleteRule,
      setBudget,
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
      addRule,
      deleteRule,
      setBudget,
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
