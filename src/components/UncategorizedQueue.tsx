// ============================================================================
// Fila de "sem categoria"
// ----------------------------------------------------------------------------
// Mostra os lançamentos que caíram em "Extras / Outros" para o usuário
// classificar sem precisar procurar no Extrato. Ao escolher uma categoria, a
// decisão vira uma regra aprendida para o mesmo estabelecimento.
// ============================================================================

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Transaction } from '../types'
import { CATEGORIES } from '../config/categories'
import { formatBRL, formatDateShort } from '../lib/format'
import { useFinance } from '../context/FinanceContext'
import { SectionTitle } from './ui'

export function UncategorizedQueue({
  transactions,
  scopeLabel,
}: {
  /** Transações já filtradas pelo período selecionado. */
  transactions: Transaction[]
  /** Texto do período, ex.: "setembro de 2026". */
  scopeLabel: string
}) {
  const { recategorizeTransaction } = useFinance()
  const [expanded, setExpanded] = useState(false)

  const pending = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'saida' && t.category === 'extras')
        .sort((a, b) => b.amount - a.amount),
    [transactions],
  )

  if (!pending.length) return null

  const total = pending.reduce((acc, t) => acc + t.amount, 0)
  const shown = expanded ? pending : pending.slice(0, 6)

  return (
    <div className="card section-gap uncategorized">
      <SectionTitle
        action={
          <Link to="/extrato?categoria=extras" className="section-link">
            Ver no extrato →
          </Link>
        }
      >
        Sem categoria
      </SectionTitle>

      <p className="muted uncategorized-note">
        {pending.length} lançamento{pending.length > 1 ? 's' : ''} em Extras · {formatBRL(total)} ·{' '}
        {scopeLabel}. Ao escolher, a categoria também vira regra para as próximas importações deste
        estabelecimento.
      </p>

      <ul className="uncategorized-list">
        {shown.map((t) => (
          <li key={t.id} className="uncategorized-row">
            <div className="uncategorized-main">
              <span className="uncategorized-name">{t.merchant}</span>
              <span className="uncategorized-meta">
                {formatDateShort(t.date)}
                {t.description && t.description !== t.merchant ? ` · ${t.description}` : ''}
              </span>
            </div>
            <span className="uncategorized-value">{formatBRL(t.amount)}</span>
            <select
              className="input input-sm uncategorized-select"
              value=""
              aria-label={`Categoria de ${t.merchant}`}
              onChange={(e) => {
                const categoryId = e.target.value
                if (categoryId) recategorizeTransaction(t.id, categoryId, true)
              }}
            >
              <option value="" disabled>
                Escolher…
              </option>
              {CATEGORIES.filter((c) => c.id !== 'extras').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>

      {pending.length > 6 && (
        <button
          className="btn btn-ghost btn-sm uncategorized-more"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Mostrar menos' : `Ver mais ${pending.length - 6}`}
        </button>
      )}
    </div>
  )
}
