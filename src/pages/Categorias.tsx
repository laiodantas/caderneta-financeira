// ============================================================================
// Categorias: cada categoria é uma "página do caderno" com total e os
// estabelecimentos agrupados.
// Os valores seguem o período escolhido (mesmo critério do Painel).
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
import { formatBRL, formatDateBR, periodLabel } from '../lib/format'
import { EmptyState } from '../components/ui'
import { NotebookIllustration } from '../components/Illustrations'
import { UncategorizedQueue } from '../components/UncategorizedQueue'

export function Categorias() {
  const { transactions, reapplyCategories } = useFinance()
  const [period, setPeriod] = useState<string>('__latest__')
  const [notice, setNotice] = useState('')

  const active = useMemo(() => activeTransactions(transactions), [transactions])

  const periods = useMemo(
    () => [...new Set(active.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    [active],
  )
  const effectivePeriod = period === '__latest__' ? periods[0] ?? 'all' : period
  const isAll = effectivePeriod === 'all'
  const scopeLabel = isAll ? 'todos os períodos' : periodLabel(effectivePeriod)

  const scoped = useMemo(
    () => (isAll ? active : active.filter((t) => t.date.slice(0, 7) === effectivePeriod)),
    [active, effectivePeriod, isAll],
  )
  const groups = useMemo(() => groupByCategory(scoped), [scoped])
  const totals = useMemo(() => totalsOf(scoped), [scoped])

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

  return (
    <div className="container page">
      <div className="page-top">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">
            {groups.length} categoria{groups.length === 1 ? '' : 's'} · saídas de{' '}
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

      {notice && <p className="muted page-notice">{notice}</p>}

      <UncategorizedQueue transactions={scoped} scopeLabel={scopeLabel} />

      <div className="grid-2 categories-grid">
        {groups.map((g) => (
          <CategoryCard
            key={g.categoryId}
            categoryId={g.categoryId}
            name={g.name}
            color={g.color}
            total={g.total}
            count={g.count}
            merchants={groupByMerchant(scoped, g.categoryId)}
          />
        ))}
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
  merchants,
}: {
  categoryId: string
  name: string
  color: string
  total: number
  count: number
  merchants: MerchantGroup[]
}) {
  const [showAllMerchants, setShowAllMerchants] = useState(false)
  const visibleMerchants = showAllMerchants ? merchants : merchants.slice(0, 6)

  return (
    <div className="card category-card">
      <div className="category-head">
        <span className="category-dot" style={{ background: color }} />
        <span className="category-name">{name}</span>
      </div>

      <div className="category-total">
        <span className="category-total-value">{formatBRL(total)}</span>
        <span className="category-total-label">
          {count} lançamento{count > 1 ? 's' : ''}
        </span>
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
 *
 * O total é somado a partir dos próprios lançamentos exibidos, para nunca
 * divergir do detalhe (mesmo com dados antigos salvos no navegador).
 */
function MerchantCard({ group }: { group: MerchantGroup }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  const transactions = useMemo(
    () => [...group.transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [group.transactions],
  )

  const total = useMemo(
    () =>
      transactions.reduce((acc, t) => {
        const value = Number(t.amount)
        return acc + (Number.isFinite(value) ? value : 0)
      }, 0),
    [transactions],
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
          {transactions.length}× · {formatBRL(total)}
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
