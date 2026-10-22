// ============================================================================
// Extrato: tabela completa com busca, filtros, ordenação e edição.
// No celular a tabela dá lugar a cartões (o valor não fica escondido).
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import { CATEGORIES, categoryColor, categoryName } from '../config/categories'
import { formatBRL, formatDateBR, periodLabel } from '../lib/format'
import { normalizeForMatch } from '../lib/normalize'
import { duplicates } from '../lib/insights'
import { EmptyState } from '../components/ui'
import { NotebookIllustration } from '../components/Illustrations'
import { TransactionModal } from '../components/TransactionModal'
import type { Transaction } from '../types'

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

/** Quantos registros são exibidos por vez (o restante vem em "Mostrar mais"). */
const PAGE_SIZE = 40

export function Extrato() {
  const { transactions, deleteTransaction } = useFinance()
  const [params] = useSearchParams()
  const buscaParam = params.get('busca') ?? ''
  const categoriaParam = params.get('categoria') ?? 'all'

  const [search, setSearch] = useState(buscaParam)
  const [category, setCategory] = useState(categoriaParam)
  const [type, setType] = useState<'all' | 'entrada' | 'saida'>('all')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState<SortKey>('date-desc')
  const [minVal, setMinVal] = useState('')
  const [maxVal, setMaxVal] = useState('')
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Atalhos vindos do Painel/Categorias podem chegar com a página já montada.
  // Também limpamos o filtro quando o menu abre o Extrato sem parâmetros.
  useEffect(() => {
    setSearch(buscaParam)
  }, [buscaParam])
  useEffect(() => {
    setCategory(categoriaParam)
  }, [categoriaParam])

  const periods = useMemo(
    () => [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    [transactions],
  )

  // Só marcamos "repetida" quando é duplicata exata (mesmo local, dia e valor).
  const duplicateIds = useMemo(() => {
    const ids = new Set<string>()
    for (const group of duplicates(transactions)) {
      for (const t of group) ids.add(t.id)
    }
    return ids
  }, [transactions])

  const filtered = useMemo(() => {
    const q = normalizeForMatch(search)
    const min = minVal ? parseFloat(minVal.replace(',', '.')) : null
    const max = maxVal ? parseFloat(maxVal.replace(',', '.')) : null

    let list = transactions.filter((t) => {
      if (category !== 'all' && t.category !== category) return false
      if (type !== 'all' && t.type !== type) return false
      if (period !== 'all' && t.date.slice(0, 7) !== period) return false
      if (min != null && t.amount < min) return false
      if (max != null && t.amount > max) return false
      if (q && !normalizeForMatch(`${t.merchant} ${t.description} ${t.tags.join(' ')}`).includes(q))
        return false
      return true
    })

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'date-asc':
          return a.date.localeCompare(b.date)
        case 'amount-desc':
          return b.amount - a.amount
        case 'amount-asc':
          return a.amount - b.amount
        default:
          return b.date.localeCompare(a.date)
      }
    })
    return list
  }, [transactions, search, category, type, period, sort, minVal, maxVal])

  // Sempre que um filtro muda, voltamos para a primeira página de resultados.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, category, type, period, sort, minVal, maxVal])

  const visible = filtered.slice(0, visibleCount)
  const remaining = filtered.length - visible.length

  const totalSaidas = filtered.filter((t) => t.type === 'saida').reduce((a, t) => a + t.amount, 0)
  const totalEntradas = filtered.filter((t) => t.type === 'entrada').reduce((a, t) => a + t.amount, 0)

  if (!transactions.length) {
    return (
      <div className="container page">
        <EmptyState
          icon={<NotebookIllustration className="empty-illustration" />}
          title="Seu extrato ainda está vazio"
          description="Importe um PDF, CSV ou OFX para começar a organizar."
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
          <h1 className="page-title">Extrato</h1>
          <p className="page-subtitle">
            {filtered.length} registro{filtered.length === 1 ? '' : 's'} · saídas {formatBRL(totalSaidas)} ·
            entradas {formatBRL(totalEntradas)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters">
        <input
          className="input search"
          placeholder="Buscar por estabelecimento ou descrição…"
          aria-label="Buscar lançamentos"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          aria-label="Filtrar por categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Filtrar por tipo"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="all">Entrada e saída</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </select>
        <select
          className="input"
          aria-label="Filtrar por período"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="all">Todos os períodos</option>
          {periods.map((p) => (
            <option key={p} value={p}>
              {periodLabel(p)}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Ordenar"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="date-desc">Mais recentes</option>
          <option value="date-asc">Mais antigas</option>
          <option value="amount-desc">Maior valor</option>
          <option value="amount-asc">Menor valor</option>
        </select>
        <div className="value-range">
          <input
            className="input"
            inputMode="decimal"
            placeholder="R$ mín."
            aria-label="Valor mínimo"
            value={minVal}
            onChange={(e) => setMinVal(e.target.value)}
          />
          <input
            className="input"
            inputMode="decimal"
            placeholder="R$ máx."
            aria-label="Valor máximo"
            value={maxVal}
            onChange={(e) => setMaxVal(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela (desktop) */}
      <div className="card table-card extrato-table-card">
        {filtered.length === 0 ? (
          <p className="rank-empty">Nenhum registro corresponde aos filtros.</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th className="ta-r">Valor</th>
                  <th className="ta-r">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} onClick={() => setEditing(t)}>
                    <td className="nowrap">{formatDateBR(t.date)}</td>
                    <td>
                      <span className="td-merchant">{t.merchant}</span>
                      {t.merchant !== t.description && (
                        <span className="td-desc">{t.description}</span>
                      )}
                      <Flags tx={t} repeated={duplicateIds.has(t.id)} />
                      {t.status === 'ignorar' && <span className="td-status-ignore">ignorada</span>}
                    </td>
                    <td>
                      <span className="cat-inline">
                        <span className="dot" style={{ background: categoryColor(t.category) }} />
                        {categoryName(t.category)}
                      </span>
                    </td>
                    <td>
                      <span className={`tx-type tx-${t.type}`}>
                        {t.type === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className={`ta-r td-value ${t.type === 'entrada' ? 'is-in' : 'is-out'}`}>
                      {t.type === 'entrada' ? '+' : '−'} {formatBRL(t.amount)}
                    </td>
                    <td className="ta-r" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="row-btn"
                        aria-label={`Excluir ${t.merchant}`}
                        onClick={() => {
                          if (confirm('Excluir este registro?')) deleteTransaction(t.id)
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cartões (celular) */}
      <div className="tx-cards">
        {filtered.length === 0 ? (
          <p className="rank-empty">Nenhum registro corresponde aos filtros.</p>
        ) : (
          visible.map((t) => (
            <article key={t.id} className="tx-card">
              <button
                type="button"
                className="tx-card-main"
                aria-label={`Editar lançamento de ${t.merchant}`}
                onClick={() => setEditing(t)}
              >
                <span className="tx-card-head">
                  <span className="tx-card-date">{formatDateBR(t.date)}</span>
                  <span className={`tx-card-value ${t.type === 'entrada' ? 'is-in' : 'is-out'}`}>
                    {t.type === 'entrada' ? '+' : '−'} {formatBRL(t.amount)}
                  </span>
                </span>
                <span className="tx-card-body">
                  <span className="tx-card-merchant">{t.merchant}</span>
                  {t.merchant !== t.description && (
                    <span className="tx-card-desc">{t.description}</span>
                  )}
                  <Flags tx={t} repeated={duplicateIds.has(t.id)} />
                </span>
              </button>
              <div className="tx-card-foot">
                <span className="cat-inline">
                  <span className="dot" style={{ background: categoryColor(t.category) }} />
                  {categoryName(t.category)}
                </span>
                <span className={`tx-type tx-${t.type}`}>
                  {t.type === 'entrada' ? 'Entrada' : 'Saída'}
                </span>
                <button
                  className="row-btn"
                  aria-label={`Excluir ${t.merchant}`}
                  onClick={() => {
                    if (confirm('Excluir este registro?')) deleteTransaction(t.id)
                  }}
                >
                  ✕
                </button>
              </div>
              {t.status === 'ignorar' && <span className="td-status-ignore">ignorada</span>}
            </article>
          ))
        )}
      </div>

      {remaining > 0 && (
        <div className="load-more">
          <button className="btn btn-ghost" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
            Mostrar mais {Math.min(PAGE_SIZE, remaining)}
          </button>
          <span className="muted load-more-note">
            Exibindo {visible.length} de {filtered.length}
          </span>
        </div>
      )}

      {editing && <TransactionModal tx={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

/** Etiquetas de parcela, duplicata, moeda estrangeira e data ausente. */
function Flags({ tx, repeated }: { tx: Transaction; repeated: boolean }) {
  return (
    <span className="td-flags">
      {tx.installment && (
        <span className="flag flag-parcel">
          Parcela {tx.installment.current}/{tx.installment.total}
        </span>
      )}
      {!tx.date && <span className="flag flag-repeated">sem data</span>}
      {repeated && <span className="flag flag-repeated">repetida</span>}
      {tx.originalCurrency && (
        <span className="flag flag-currency">
          {tx.originalAmount?.toFixed(2)} {tx.originalCurrency}
        </span>
      )}
    </span>
  )
}
