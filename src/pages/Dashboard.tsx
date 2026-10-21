// ============================================================================
// Painel (tela principal)
// ============================================================================

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import { activeTransactions, totalsOf, groupByCategory, groupByMerchant, groupByMonth, balanceEvolution } from '../lib/aggregate'
import { biggestExpense, avgDailySpend, mostExpensiveWeekday, endOfMonthProjection, compareMonths, recurringExpenses, anomalies, duplicates, smartSummary } from '../lib/insights'
import { formatBRL, periodLabel } from '../lib/format'
import { SectionTitle, Tag } from '../components/ui'
import { NotebookIllustration } from '../components/Illustrations'
import { StatStrip } from '../components/StatStrip'
import { RankedList } from '../components/RankedList'
import { ChartCard, DonutChart, MonthlyBarChart, BalanceLineChart } from '../components/charts'

export function Dashboard() {
  const { transactions, loadSample } = useFinance()

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

  const isAll = effectivePeriod === 'all'
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
      {(suspicious.length > 0 || dups.length > 0 || recurring.length > 0) && (
        <div className="alerts">
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
          </div>
        </div>
      </div>
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
