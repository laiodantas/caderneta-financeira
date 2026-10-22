// ============================================================================
// Gráficos (Recharts) estilizados no tema do caderno.
// ============================================================================

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts'
import type { ReactNode } from 'react'
import { formatBRL, periodLabel, periodShort, formatDateShort } from '../lib/format'
import { SectionTitle } from './ui'

/** Formato compacto para o centro do donut: "R$ 1,2 mil". */
function shortBRL(v: number): string {
  if (Math.abs(v) >= 1000) return `R$ ${compactNumber(v)}`
  return `R$ ${Math.round(v)}`
}

/** Número compacto para eixos: "10k", "7,5k", "0", "-3k". */
function compactNumber(v: number): string {
  if (Math.abs(v) >= 1000) {
    const n = v / 1000
    const text = Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
    return `${text}k`
  }
  return String(Math.round(v))
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ChartTooltip({ active, payload, label, labelFormatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      {label != null && (
        <div className="chart-tooltip-label">
          {labelFormatter ? labelFormatter(label, payload) : label}
        </div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="chart-tooltip-row">
          <span className="ct-dot" style={{ background: p.color || p.payload?.color || p.fill }} />
          <span className="ct-name">{p.name}</span>
          <span className="ct-val">{formatBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Card que envolve um gráfico, com título e legenda opcionais. */
export function ChartCard({
  title,
  subtitle,
  legend,
  children,
  height = 260,
}: {
  title: string
  subtitle?: string
  legend?: { label: string; color: string }[]
  children: ReactNode
  height?: number | string
}) {
  return (
    <div className={`card chart-card${height === 'auto' ? ' chart-card-auto' : ''}`}>
      <div className="chart-card-head">
        <SectionTitle as="h3">{title}</SectionTitle>
        {subtitle && <span className="chart-subtitle">{subtitle}</span>}
        {legend && (
          <div className="chart-legend">
            {legend.map((l) => (
              <span key={l.label} className="legend-item">
                <span className="dot" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ height }} className="chart-body">
        {children}
      </div>
    </div>
  )
}

export interface DonutDatum {
  name: string
  value: number
  color: string
}

/** Gráfico de rosca (donut) com legenda lateral. */
export function DonutChart({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  return (
    <div className="donut-wrap">
      <div className="donut-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              strokeWidth={0}
              cornerRadius={4}
              isAnimationActive
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span className="donut-center-value">{shortBRL(total)}</span>
          <span className="donut-center-label">total</span>
        </div>
      </div>
      <ul className="donut-legend">
        {data.slice(0, 10).map((d) => (
          <li key={d.name}>
            <span className="dot" style={{ background: d.color }} />
            <span className="dl-name">{d.name}</span>
            <span className="dl-val">{formatBRL(d.value)}</span>
            <span className="dl-pct">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface MonthDatum {
  period: string
  entradas: number
  saidas: number
}

/** Gráfico de barras: entradas vs saídas por mês. */
export function MonthlyBarChart({ data }: { data: MonthDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke="rgba(110,140,165,0.14)" strokeDasharray="3 4" />
        <XAxis
          dataKey="period"
          tickFormatter={periodShort}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6E7B8E', fontSize: 12 }}
        />
        <YAxis
          tickFormatter={compactNumber}
          axisLine={false}
          tickLine={false}
          width={44}
          tick={{ fill: '#6E7B8E', fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip labelFormatter={(l: string) => periodLabel(l)} />} cursor={{ fill: 'rgba(30,42,74,0.04)' }} />
        <Bar dataKey="entradas" name="Entradas" fill="#1E2A4A" radius={[6, 6, 0, 0]} maxBarSize={26} />
        <Bar dataKey="saidas" name="Saídas" fill="#C74F3E" radius={[6, 6, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export interface BalanceDatum {
  date: string
  saldo: number
}

/** Gráfico de linha/área: evolução do saldo. */
export function BalanceLineChart({ data }: { data: BalanceDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E2A4A" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#1E2A4A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(110,140,165,0.14)" strokeDasharray="3 4" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6E7B8E', fontSize: 11 }}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={compactNumber}
          axisLine={false}
          tickLine={false}
          width={44}
          tick={{ fill: '#6E7B8E', fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip labelFormatter={(l: string) => formatDateShort(l)} />} />
        <Area
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke="#1E2A4A"
          strokeWidth={2.4}
          fill="url(#saldoFill)"
          dot={false}
          activeDot={{ r: 4, fill: '#C74F3E', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
