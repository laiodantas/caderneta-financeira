// ============================================================================
// Categorias: cada categoria é uma "página do caderno" com total, percentual,
// orçamento e os estabelecimentos agrupados.
// ============================================================================

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import { activeTransactions, totalsOf, groupByCategory, groupByMerchant } from '../lib/aggregate'
import { CATEGORIES } from '../config/categories'
import { formatBRL } from '../lib/format'
import { EmptyState } from '../components/ui'
import { NotebookIllustration } from '../components/Illustrations'

export function Categorias() {
  const { transactions, budgets, setBudget } = useFinance()
  const active = useMemo(() => activeTransactions(transactions), [transactions])
  const groups = useMemo(() => groupByCategory(active), [active])
  const totals = useMemo(() => totalsOf(active), [active])

  if (!active.length) {
    return (
      <div className="container page">
        <EmptyState
          icon={<NotebookIllustration className="empty-illustration" />}
          title="Nenhuma categoria ainda"
          description="Importe um extrato para ver seus gastos organizados por categoria."
        >
          <Link to="/importar" className="btn btn-primary">
            + Importar extrato
          </Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="container page">
      <div className="page-top">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">
            {groups.length} categorias · total de saídas {formatBRL(totals.saidas)}
          </p>
        </div>
      </div>

      <div className="grid-2">
        {groups.map((g) => {
          const merchants = groupByMerchant(active, g.categoryId).slice(0, 4)
          return (
            <CategoryCard
              key={g.categoryId}
              categoryId={g.categoryId}
              name={g.name}
              color={g.color}
              total={g.total}
              count={g.count}
              percent={g.percent}
              merchants={merchants}
              budget={budgets[g.categoryId] ?? CATEGORIES.find((c) => c.id === g.categoryId)?.budget ?? 0}
              onSetBudget={(v) => setBudget(g.categoryId, v)}
            />
          )
        })}
      </div>
    </div>
  )
}

function CategoryCard({
  categoryId,
  name,
  color,
  total,
  count,
  percent,
  merchants,
  budget,
  onSetBudget,
}: {
  categoryId: string
  name: string
  color: string
  total: number
  count: number
  percent: number
  merchants: { merchant: string; total: number; count: number }[]
  budget: number
  onSetBudget: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(budget || ''))

  const pct = budget > 0 ? (total / budget) * 100 : 0
  const over = budget > 0 && pct > 100

  const saveBudget = () => {
    const v = parseFloat(draft.replace(',', '.'))
    onSetBudget(Number.isFinite(v) && v >= 0 ? v : 0)
    setEditing(false)
  }

  return (
    <div className="card category-card">
      <div className="category-head">
        <span className="category-dot" style={{ background: color }} />
        <span className="category-name">{name}</span>
        <span className="category-pct">{percent.toFixed(0)}%</span>
      </div>

      <div className="category-total">
        <span className="category-total-value">{formatBRL(total)}</span>
        <span className="category-total-label">{count} lançamento{count > 1 ? 's' : ''}</span>
      </div>

      {/* Orçamento */}
      <div className="budget">
        {budget > 0 ? (
          <>
            <div className="budget-line">
              <span className="budget-label">
                Orçamento {formatBRL(total)} / {formatBRL(budget)}
              </span>
              <button className="budget-edit" onClick={() => { setDraft(String(budget)); setEditing(true) }}>
                editar
              </button>
            </div>
            <div className="budget-bar">
              <div
                className={`budget-fill ${over ? 'over' : ''}`}
                style={{ width: `${Math.min(100, pct)}%`, background: over ? '#C74F3E' : color }}
              />
            </div>
            {over && <span className="budget-warn">Passou do limite em {formatBRL(total - budget)}</span>}
          </>
        ) : (
          <>
            {editing ? (
              <div className="budget-edit-row">
                <input
                  className="input input-sm"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="R$ 0,00"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                />
                <button className="btn btn-sm btn-primary" onClick={saveBudget}>
                  OK
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button className="budget-add" onClick={() => setEditing(true)}>
                + definir orçamento
              </button>
            )}
          </>
        )}
      </div>

      {/* Estabelecimentos */}
      {merchants.length > 0 && (
        <ul className="merchant-list">
          {merchants.map((m) => (
            <li key={m.merchant} className="merchant-row">
              <span className="merchant-name">{m.merchant}</span>
              <span className="merchant-count">{m.count}×</span>
              <span className="merchant-value">{formatBRL(m.total)}</span>
            </li>
          ))}
        </ul>
      )}

      <Link to={`/extrato?categoria=${categoryId}`} className="section-link">
        Ver transações →
      </Link>
    </div>
  )
}
