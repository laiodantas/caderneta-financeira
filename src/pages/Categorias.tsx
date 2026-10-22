// ============================================================================
// Categorias: cada categoria é uma "página do caderno" com total, percentual,
// orçamento e os estabelecimentos agrupados.
// Os valores seguem o período escolhido (mesmo critério do Painel). O orçamento
// é mensal e pode ter um valor próprio em cada mês; no período "todos", o
// limite é a soma dos orçamentos dos meses importados.
// ============================================================================

import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import {
  activeTransactions,
  totalsOf,
  groupByCategory,
  groupByMerchant,
  type MerchantGroup,
} from '../lib/aggregate'
import { CATEGORIES } from '../config/categories'
import {
  budgetBase,
  budgetForMonth,
  budgetForPeriods,
  currentPeriod,
  hasAnyBudget,
  hasBaseOverride,
  hasMonthOverride,
  projectionForPeriod,
} from '../lib/budget'
import { formatBRL, formatDateBR, periodLabel } from '../lib/format'
import { EmptyState, Tag } from '../components/ui'
import { NotebookIllustration } from '../components/Illustrations'
import { UncategorizedQueue } from '../components/UncategorizedQueue'

/** Origem do valor de orçamento exibido. */
type BudgetSource = 'month' | 'base' | 'default'

export function Categorias() {
  const { transactions, budgets, setBudget, clearBudget, reapplyCategories } = useFinance()
  const [period, setPeriod] = useState<string>('__latest__')
  const [notice, setNotice] = useState('')

  const active = useMemo(() => activeTransactions(transactions), [transactions])

  const periods = useMemo(
    () => [...new Set(active.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    [active],
  )
  const effectivePeriod = period === '__latest__' ? periods[0] ?? 'all' : period
  const isAll = effectivePeriod === 'all'
  const monthsInScope = useMemo(
    () => (isAll ? periods : [effectivePeriod]),
    [isAll, periods, effectivePeriod],
  )
  const monthCount = monthsInScope.length
  const scopeLabel = isAll ? 'todos os períodos' : periodLabel(effectivePeriod)

  const scoped = useMemo(
    () => (isAll ? active : active.filter((t) => t.date.slice(0, 7) === effectivePeriod)),
    [active, effectivePeriod, isAll],
  )
  const groups = useMemo(() => groupByCategory(scoped), [scoped])
  const totals = useMemo(() => totalsOf(scoped), [scoped])

  // Categorias com orçamento aparecem mesmo sem gasto no período, para deixar
  // claro que o limite existe e está zerado.
  const visible = useMemo(() => {
    const byId = new Map(groups.map((g) => [g.categoryId, g]))
    for (const category of CATEGORIES) {
      if (category.id === 'extras' || category.id === 'renda') continue
      if (byId.has(category.id) || !hasAnyBudget(budgets, category.id)) continue
      byId.set(category.id, {
        categoryId: category.id,
        name: category.name,
        color: category.color,
        total: 0,
        count: 0,
        percent: 0,
      })
    }
    return [...byId.values()].sort(
      (a, b) => b.total - a.total || a.name.localeCompare(b.name),
    )
  }, [groups, budgets])

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

  const handleReapply = () => {
    const ok = confirm(
      'Atualizar todos os lançamentos com as regras atuais?\n\n' +
        '• Reclassifica as categorias automáticas.\n' +
        '• Remove artefatos dos nomes (ex.: "( )").\n' +
        '• Categorias que você escolheu manualmente são preservadas.',
    )
    if (!ok) return
    const changed = reapplyCategories()
    setNotice(
      changed
        ? `${changed} lançamento${changed > 1 ? 's foram atualizados' : ' foi atualizado'}.`
        : 'Nenhum lançamento precisava de ajuste.',
    )
  }

  const projection = projectionForPeriod(totals.saidas, isAll ? currentPeriod() : effectivePeriod)

  return (
    <div className="container page">
      <div className="page-top">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">
            {visible.length} categoria{visible.length === 1 ? '' : 's'} · saídas de{' '}
            {scopeLabel}: {formatBRL(totals.saidas)}
          </p>
        </div>
        <div className="page-top-actions">
          <label className="period-select">
            <span className="muted">Período</span>
            <select
              className="input input-sm"
              value={effectivePeriod}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="all">Todos os períodos</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {periodLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={handleReapply}>
            Atualizar lançamentos
          </button>
        </div>
      </div>

      <p className="muted page-notice">
        Orçamentos são mensais e podem ser ajustados mês a mês.
        {isAll && ` No período completo, o limite soma ${monthCount} ${monthCount === 1 ? 'mês' : 'meses'}.`}
        {notice && <span className="page-notice-result"> {notice}</span>}
      </p>

      <UncategorizedQueue transactions={scoped} scopeLabel={scopeLabel} />

      <div className="grid-2">
        {visible.map((g) => {
          const budgetTotal = budgetForPeriods(budgets, g.categoryId, monthsInScope)
          const monthlyBudget = isAll
            ? budgetBase(budgets, g.categoryId)
            : budgetForMonth(budgets, g.categoryId, effectivePeriod)
          const source: BudgetSource = hasMonthOverride(
            budgets,
            g.categoryId,
            isAll ? '' : effectivePeriod,
          )
            ? 'month'
            : hasBaseOverride(budgets, g.categoryId)
              ? 'base'
              : 'default'

          return (
            <CategoryCard
              key={g.categoryId}
              categoryId={g.categoryId}
              name={g.name}
              color={g.color}
              total={g.total}
              count={g.count}
              percent={g.percent}
              merchants={groupByMerchant(scoped, g.categoryId)}
              monthlyBudget={monthlyBudget}
              budgetTotal={budgetTotal}
              source={source}
              monthsCount={monthCount}
              monthLabel={isAll ? '' : periodLabel(effectivePeriod)}
              projected={projection}
              isCurrentMonth={projection.isCurrent && !isAll}
              onSetBudget={(v) => setBudget(g.categoryId, v, isAll ? undefined : effectivePeriod)}
              onResetBudget={() => {
                const monthOverride = !isAll && hasMonthOverride(budgets, g.categoryId, effectivePeriod)
                clearBudget(g.categoryId, monthOverride ? effectivePeriod : undefined)
              }}
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
  monthlyBudget,
  budgetTotal,
  source,
  monthsCount,
  monthLabel,
  projected,
  isCurrentMonth,
  onSetBudget,
  onResetBudget,
}: {
  categoryId: string
  name: string
  color: string
  total: number
  count: number
  percent: number
  merchants: MerchantGroup[]
  /** Orçamento mensal (valor editável). */
  monthlyBudget: number
  /** Orçamento equivalente ao período exibido (soma dos meses). */
  budgetTotal: number
  /** De onde veio o valor exibido. */
  source: BudgetSource
  monthsCount: number
  /** Mês exibido (vazio no período completo). */
  monthLabel: string
  projected: ReturnType<typeof projectionForPeriod>
  /** Só projeta no mês corrente. */
  isCurrentMonth: boolean
  onSetBudget: (v: number) => void
  onResetBudget: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [showAllMerchants, setShowAllMerchants] = useState(false)
  const visibleMerchants = showAllMerchants ? merchants : merchants.slice(0, 6)

  const pct = budgetTotal > 0 ? (total / budgetTotal) * 100 : 0
  const over = budgetTotal > 0 && total > budgetTotal
  const projectedOver =
    isCurrentMonth && budgetTotal > 0 && projected.projection > budgetTotal

  const startEdit = () => {
    setDraft(monthlyBudget ? String(monthlyBudget) : '')
    setEditing(true)
  }

  const saveBudget = () => {
    const v = parseFloat(draft.replace(',', '.'))
    onSetBudget(Number.isFinite(v) && v >= 0 ? v : 0)
    setEditing(false)
  }

  const sourceTag =
    source === 'month' ? 'próprio do mês' : source === 'base' ? 'definido' : 'sugerido'

  return (
    <div className={`card category-card ${count === 0 ? 'is-empty' : ''}`}>
      <div className="category-head">
        <span className="category-dot" style={{ background: color }} />
        <span className="category-name">{name}</span>
        <span className="category-pct" title="Participação nas saídas do período">
          {percent.toFixed(0)}%
        </span>
      </div>

      <div className="category-total">
        <span className="category-total-value">{formatBRL(total)}</span>
        <span className="category-total-label">
          {count === 0
            ? 'sem gastos no período'
            : `${count} lançamento${count > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Orçamento */}
      <div className="budget">
        {editing ? (
          <>
            <span className="budget-label">
              {monthLabel ? `Orçamento de ${monthLabel}` : 'Orçamento mensal padrão'}
            </span>
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
          </>
        ) : budgetTotal > 0 ? (
          <>
            <div className="budget-line">
              <span className="budget-label">
                Orçamento {formatBRL(total)} / {formatBRL(budgetTotal)}
                {monthsCount > 1 && ` (${monthsCount} meses)`}
              </span>
              <span className="budget-actions">
                <Tag tone="neutral">{sourceTag}</Tag>
                <button className="budget-edit" onClick={startEdit}>
                  editar
                </button>
                {source !== 'default' && (
                  <button
                    className="budget-edit budget-reset"
                    onClick={onResetBudget}
                    title="Voltar ao valor padrão"
                  >
                    restaurar
                  </button>
                )}
              </span>
            </div>
            <div className="budget-bar">
              <div
                className={`budget-fill ${over ? 'over' : ''}`}
                style={{ width: `${Math.min(100, pct)}%`, background: over ? undefined : color }}
              />
            </div>
            {over && (
              <span className="budget-warn">Passou do limite em {formatBRL(total - budgetTotal)}</span>
            )}
            {!over && isCurrentMonth && total > 0 && (
              <span className={`budget-projection ${projectedOver ? 'is-over' : ''}`}>
                No ritmo atual: {formatBRL(projected.projection)} até o fim do mês
                {projectedOver
                  ? ` — estoura em ${formatBRL(projected.projection - budgetTotal)}`
                  : ''}
              </span>
            )}
          </>
        ) : (
          <button className="budget-add" onClick={startEdit}>
            + definir orçamento
          </button>
        )}
      </div>

      {/* Estabelecimentos: um card por grupo; ao abrir, lista os débitos com data. */}
      {merchants.length > 0 && (
        <div className="merchant-grid">
          {visibleMerchants.map((m) => (
            <MerchantCard key={m.merchant} group={m} />
          ))}
        </div>
      )}
      {merchants.length > 6 && (
        <button
          type="button"
          className="merchant-more"
          onClick={() => setShowAllMerchants((v) => !v)}
        >
          {showAllMerchants
            ? 'Mostrar menos'
            : `Ver todos os ${merchants.length} estabelecimentos`}
        </button>
      )}

      <Link to={`/extrato?categoria=${categoryId}`} className="section-link">
        Ver transações →
      </Link>
    </div>
  )
}

/**
 * Card de um estabelecimento dentro da categoria.
 * Fechado: nome, quantidade e total. Aberto: cada débito com data, descrição e
 * valor, do mais recente para o mais antigo.
 */
function MerchantCard({ group }: { group: MerchantGroup }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  const transactions = useMemo(
    () => [...group.transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [group.transactions],
  )

  return (
    <div className={`merchant-card ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="merchant-card-head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="merchant-card-name" title={group.merchant}>
          {group.merchant}
        </span>
        <span className="merchant-card-meta">
          {group.count}× · {formatBRL(group.total)}
        </span>
        <span className="merchant-card-toggle" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <ul className="merchant-tx-list" id={panelId}>
          {transactions.map((t) => (
            <li key={t.id} className="merchant-tx">
              <span className="merchant-tx-date">{formatDateBR(t.date)}</span>
              <span className="merchant-tx-desc" title={t.description}>
                {t.description || group.merchant}
              </span>
              <span className="merchant-tx-value">{formatBRL(t.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
