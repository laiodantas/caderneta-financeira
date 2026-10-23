import { useState } from 'react'
import { useFinance } from '../context/FinanceContext'
import { CATEGORIES } from '../config/categories'
import { budgetBase, budgetForMonth } from '../lib/budget'
import { parseAmountInput, formatBRL } from '../lib/format'
export function BudgetEditor({ period }: { period?: string }) {
  const { budgets, setBudget, clearBudget } = useFinance()
  const [category, setCategory] = useState('mercado'),
    [value, setValue] = useState(''),
    [error, setError] = useState('')
  const amount = period ? budgetForMonth(budgets, category, period) : budgetBase(budgets, category)
  return (
    <details className="card section-gap">
      <summary>Definir orçamento {period ? 'do mês selecionado' : 'padrão mensal'}</summary>
      <p className="muted">Limite atual: {formatBRL(amount)}. Zero significa sem limite.</p>
      <div className="success-actions">
        <label>
          Categoria
          <select
            className="input"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setValue('')
            }}
          >
            {CATEGORIES.filter((c) => !['renda', 'pix_recebido'].includes(c.id)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Novo limite
          <input
            className="input"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <button
          className="btn btn-primary"
          onClick={() => {
            const n = parseAmountInput(value)
            if (n == null || n < 0) {
              setError('Informe um valor válido maior ou igual a zero.')
              return
            }
            setBudget(category, n, period)
            setError('')
            setValue('')
          }}
        >
          Salvar limite
        </button>
        <button className="btn btn-ghost" onClick={() => clearBudget(category, period)}>
          Restaurar padrão
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </details>
  )
}
