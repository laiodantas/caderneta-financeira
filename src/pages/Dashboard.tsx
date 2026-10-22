// ============================================================================
// Painel (tela principal)
// ============================================================================

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import { activeTransactions, totalsOf, groupByCategory, groupByMerchant, groupByMonth, balanceEvolution } from '../lib/aggregate'
import { biggestExpense, avgDailySpend, mostExpensiveWeekday, endOfMonthProjection, compareMonths, recurringExpenses, anomalies, duplicates, smartSummary, repeatedCharges, installmentPlans, topCharges } from '../lib/insights'
import { formatBRL, periodLabel, formatDateShort } from '../lib/format'
import { currentPeriod, projectionForPeriod, totalBudgetForPeriods } from '../lib/budget'
import { categoryName, categoryColor } from '../config/categories'
import { SectionTitle, Tag } from '../components/ui'
import { NotebookIllustration } from '../components/Illustrations'
import { StatStrip } from '../components/StatStrip'
import { RankedList } from '../components/RankedList'
import { ChartCard, DonutChart, MonthlyBarChart, BalanceLineChart } from '../components/charts'

export function Dashboard() {
  const { transactions, statements, budgets, loadSample } = useFinance()

  const periods = useMemo(
    () => [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    [transactions],
  )
  const [period, setPeriod] = useState<string>('__latest__')
  const effectivePeriod = period === '__latest__' ? periods[0] ?? 'all' : period

  const active = useMemo(() => activeTransactions(transactions), [transactions])
  const filtered = useMemo(
    () =>
      effectivePeriod === 'all'
        ? active
        : active.filter((t) => t.date.slice(0, 7) === effectivePeriod),
    [active, effectivePeriod],
  )

  const totals = useMemo(() => totalsOf(filtered), [filtered])
  const categories = useMemo(() => groupByCategory(filtered), [filtered])
  const months = useMemo(() => groupByMonth(active), [active])
  const balance = useMemo(() => balanceEvolution(active), [active])
  const ranking = useMemo(() => groupByMerchant(filtered).slice(0, 6), [filtered])

  const biggest = useMemo(() => biggestExpense(filtered), [filtered])
  const avgDaily = useMemo(() => avgDailySpend(filtered), [filtered])
  const weekday = useMemo(() => mostExpensiveWeekday(filtered), [filtered])
  const proj = useMemo(() => endOfMonthProjection(filtered), [filtered])
  const comparison = useMemo(() => compareMonths(active), [active])
  const recurring = useMemo(() => recurringExpenses(active), [active])
  const suspicious = useMemo(() => anomalies(active), [active])
  const dups = useMemo(() => duplicates(active), [active])
  const summary = useMemo(() => smartSummary(filtered), [filtered])

  // Cobranças repetidas, parcelamentos e as 5 maiores cobranças.
  const repeated = useMemo(() => repeatedCharges(filtered), [filtered])
  const plans = useMemo(() => installmentPlans(active), [active])
  const top5 = useMemo(() => topCharges(filtered, 5), [filtered])
  const pending = useMemo(
    () => statements.flatMap((s) => s.pendingInstallments ?? []),
    [statements],
  )

  const isAll = effectivePeriod === 'all'
  const isCurrentMonth = !isAll && effectivePeriod === currentPeriod()
  const totalBudget = useMemo(
    () => totalBudgetForPeriods(budgets, isAll ? periods : [effectivePeriod]),
    [budgets, isAll, periods, effectivePeriod],
  )
  const budgetPct = totalBudget > 0 ? (totals.saidas / totalBudget) * 100 : 0
  const projection = useMemo(
    () => projectionForPeriod(totals.saidas, isAll ? currentPeriod() : effectivePeriod),
    [totals.saidas, isAll, effectivePeriod],
  )
  const willOverspend =
    isCurrentMonth && totalBudget > 0 && projection.projection > totalBudget

  // ---- Estado vazio --------------------------------------------------------
  if (!transactions.length) {
    return (
      <div className="container page">
        <div className="card empty-hero">
          <NotebookIllustration className="empty-hero-illustration" />
          <div className="empty-hero-text">
            <h1 className="empty-hero-title">Jogue seu extrato aqui</h1>
            <p className="empty-hero-desc">
              Arraste um PDF, CSV ou OFX do seu banco e a Caderneta organiza tudo —
              categorias, gráficos e insights — direto no navegador, sem enviar
              seus dados para lugar nenhum.
            </p>
            <div className="empty-hero-actions">
              <Link to="/importar" className="btn btn-primary">
                + Importar extrato
              </Link>
              <button className="btn btn-ghost" onClick={loadSample}>
                Ver com dados de exemplo
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const heroLabel = isAll ? 'Total no período' : 'Total no mês'

  return (
    <div className="container page">
      {/* Seletor de período */}
      <div className="page-top">
        <span className="page-greeting">Sua caderneta financeira</span>
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
      </div>

      {/* Hero */}
      <div className="card hero">
        <div className="hero-body">
          <span className="hero-label">{heroLabel}</span>
          <span className="hero-value">{formatBRL(totals.saidas)}</span>
          <span className="hero-legend">
            {totals.count} lançamento{totals.count === 1 ? '' : 's'} ·{' '}
            {isAll ? 'todos os meses' : periodLabel(effectivePeriod)}
            {comparison?.changePct != null && !isAll && (
              <span className="hero-delta">
                {' '}
                · {comparison.changePct >= 0 ? '+' : ''}
                {comparison.changePct.toFixed(0)}% vs mês anterior
              </span>
            )}
          </span>
        </div>
        <div className="hero-illustration">
          <NotebookIllustration />
        </div>
      </div>

      {/* Indicadores */}
      <StatStrip
        items={[
          { label: 'Total de entradas', value: formatBRL(totals.entradas), icon: 'in' },
          { label: 'Total de saídas', value: formatBRL(totals.saidas), icon: 'out' },
          {
            label: 'Saldo do período',
            value: formatBRL(totals.saldo),
            icon: 'balance',
            hint: totals.saldo >= 0 ? 'positivo' : 'negativo',
          },
        ]}
      />

      {/* Gráficos: rosca + barras */}
      <div className="grid-2">
        <ChartCard title="Distribuição por categoria" subtitle="para onde foi seu dinheiro">
          <DonutChart
            data={categories.map((c) => ({ name: c.name, value: c.total, color: c.color }))}
          />
        </ChartCard>
        <ChartCard
          title="Entradas e saídas por mês"
          legend={[
            { label: 'Entradas', color: '#1E2A4A' },
            { label: 'Saídas', color: '#C74F3E' },
          ]}
        >
          <MonthlyBarChart data={months} />
        </ChartCard>
      </div>

      {/* Evolução do saldo */}
      <ChartCard title="Evolução do saldo" subtitle="acumulado ao longo do tempo" height={240}>
        <BalanceLineChart data={balance} />
      </ChartCard>

      {/* Alertas (anomalias / duplicidades / recorrentes) */}
      {(suspicious.length > 0 || dups.length > 0 || recurring.length > 0 || willOverspend) && (
        <div className="alerts">
          {willOverspend && (
            <span className="alert-item">
              <Tag tone="coral">Orçamento</Tag> no ritmo atual, o mês fecha em{' '}
              {formatBRL(projection.projection)} (limite {formatBRL(totalBudget)})
            </span>
          )}
          {suspicious.length > 0 && (
            <span className="alert-item">
              <Tag tone="coral">Atenção</Tag> {suspicious.length} cobrança{suspicious.length > 1 ? 's' : ''} acima do normal
            </span>
          )}
          {dups.length > 0 && (
            <span className="alert-item">
              <Tag tone="coral">Duplicidade</Tag> {dups.length} possível(is) cobrança(s) repetida(s)
            </span>
          )}
          {recurring.length > 0 && (
            <span className="alert-item">
              <Tag tone="blue">Recorrente</Tag> {recurring.length} gasto(s) que se repetem todo mês
            </span>
          )}
        </div>
      )}

      <div className="grid-2">
        {/* Ranking */}
        <div className="card">
          <SectionTitle
            action={
              <Link to="/extrato" className="section-link">
                Todos os registros →
              </Link>
            }
          >
            Onde mais gastei
          </SectionTitle>
          <RankedList
            items={ranking.map((m) => ({
              id: m.merchant,
              title: m.merchant,
              subtitle: `${m.count} lançamento${m.count > 1 ? 's' : ''}`,
              value: formatBRL(m.total),
            }))}
          />
        </div>

        {/* Resumo + insights */}
        <div className="insights-col">
          {summary && (
            <div className="note">
              <span className="note-label">Resumo do caderno</span>
              <p className="note-text">{summary}</p>
            </div>
          )}
          <div className="insight-grid">
            <InsightCard label="Maior despesa" value={biggest ? formatBRL(biggest.amount) : '—'} detail={biggest?.merchant} />
            <InsightCard label="Média por dia" value={formatBRL(avgDaily)} />
            <InsightCard label="Dia mais caro" value={weekday.weekday} detail={formatBRL(weekday.total)} />
            <InsightCard label="Projeção fim do mês" value={formatBRL(proj.projection)} detail={`${proj.daysLeft} dias restantes`} />
            {totalBudget > 0 && (
              <InsightCard
                label={isAll ? 'Orçamento do período' : 'Orçamento do mês'}
                value={`${Math.round(budgetPct)}%`}
                detail={`${formatBRL(totals.saidas)} de ${formatBRL(totalBudget)}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* 5 maiores cobranças + cobranças repetidas */}
      <div className="grid-2 section-gap">
        <div className="card">
          <SectionTitle>As 5 maiores cobranças</SectionTitle>
          <RankedList
            emptyText="Nenhuma cobrança neste período."
            items={top5.map((t) => ({
              id: t.id,
              title: t.merchant,
              subtitle: `${formatDateShort(t.date)} · ${categoryName(t.category)}`,
              tag: t.installment ? `${t.installment.current}/${t.installment.total}` : undefined,
              value: formatBRL(t.amount),
              subvalue: t.originalCurrency
                ? `${t.originalAmount?.toFixed(2)} ${t.originalCurrency}`
                : undefined,
            }))}
          />
        </div>

        <div className="card">
          <SectionTitle
            action={
              <Link to="/extrato" className="section-link">
                Ver no extrato →
              </Link>
            }
          >
            Cobranças repetidas
          </SectionTitle>
          <RankedList
            emptyText="Nenhuma cobrança repetida neste período."
            items={repeated.slice(0, 8).map((r) => ({
              id: r.merchant,
              title: r.merchant,
              subtitle: `${r.count}× · ${formatDates(r.dates)}`,
              tag: r.sameDay > 0 ? 'mesmo dia' : r.monthly ? 'mensal' : undefined,
              value: formatBRL(r.total),
              subvalue: `maior ${formatBRL(r.max)}`,
            }))}
          />
        </div>
      </div>

      {/* Parcelamentos */}
      {(plans.length > 0 || pending.length > 0) && (
        <div className="card section-gap">
          <SectionTitle>Parcelamentos</SectionTitle>
          <p className="muted installment-note">
            Compras parceladas de todos os períodos importados
          </p>
          {plans.length === 0 && pending.length === 0 && (
            <p className="rank-empty">Nenhuma compra parcelada por aqui.</p>
          )}
          {plans.length > 0 && (
            <ul className="installment-list">
              {plans.map((p) => (
                <li key={p.key} className="installment-row">
                  <div className="installment-head">
                    <span className="installment-name">{p.merchant}</span>
                    <Tag tone="blue">
                      Parcela {p.current}/{p.total}
                    </Tag>
                    <span className="installment-total">{formatBRL(p.planTotal)}</span>
                  </div>
                  <div className="installment-meta">
                    {formatBRL(p.installmentAmount)} por parcela · pago {formatBRL(p.paid)} · falta{' '}
                    {formatBRL(p.remaining)}
                  </div>
                  <div className="budget-bar">
                    <div
                      className="budget-fill"
                      style={{ width: `${Math.round(p.progress)}%`, background: categoryColor(p.categoryId) }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pending.length > 0 && (
            <>
              <div className="installment-subtitle">Próximas parcelas a cobrar</div>
              <ul className="installment-list">
                {pending.map((p, i) => (
                  <li key={`${p.description}-${p.current}-${i}`} className="installment-row">
                    <div className="installment-head">
                      <span className="installment-name">{p.description}</span>
                      <Tag tone="green">
                        Parcela {p.current}/{p.total}
                      </Tag>
                      <span className="installment-total">{formatBRL(p.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="card insight-card">
      <span className="insight-label">{label}</span>
      <span className="insight-value">{value}</span>
      {detail && <span className="insight-detail">{detail}</span>}
    </div>
  )
}

/** Lista as datas de um conjunto de cobranças (encurtando quando são muitas). */
function formatDates(dates: string[]): string {
  const shown = dates.slice(0, 4).map(formatDateShort)
  const rest = dates.length - shown.length
  return rest > 0 ? `${shown.join(', ')} +${rest}` : shown.join(', ')
}
