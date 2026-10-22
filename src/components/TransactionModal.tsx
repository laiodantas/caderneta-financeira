// ============================================================================
// Modal de edição de uma transação: categoria, classificação, tags e nota,
// com opção de "aprender" a regra para as próximas.
// ============================================================================

import { useEffect, useState } from 'react'
import type { Transaction, TransactionStatus } from '../types'
import { CATEGORIES } from '../config/categories'
import { useFinance } from '../context/FinanceContext'
import { formatBRL, formatDateBR, formatNumber, parseAmountInput } from '../lib/format'
import { Modal } from './ui'

const STATUS_OPTIONS: { value: TransactionStatus | ''; label: string }[] = [
  { value: '', label: 'Normal' },
  { value: 'essencial', label: 'Essencial' },
  { value: 'superflua', label: 'Supérflua' },
  { value: 'ignorar', label: 'Ignorar (não conta)' },
]

export function TransactionModal({
  tx,
  onClose,
}: {
  tx: Transaction
  onClose: () => void
}) {
  const { updateTransaction, addRule } = useFinance()
  const [date, setDate] = useState(tx.date)
  const [amountStr, setAmountStr] = useState(formatNumber(tx.amount))
  const [category, setCategory] = useState(tx.category)
  const [status, setStatus] = useState<TransactionStatus | ''>(tx.status ?? '')
  const [note, setNote] = useState(tx.note ?? '')
  const [tags, setTags] = useState((tx.tags ?? []).join(', '))
  const [learn, setLearn] = useState(true)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    setDate(tx.date)
    setAmountStr(formatNumber(tx.amount))
    setCategory(tx.category)
    setStatus(tx.status ?? '')
    setNote(tx.note ?? '')
    setTags((tx.tags ?? []).join(', '))
    setLearn(true)
    setFormError('')
  }, [tx])

  const save = () => {
    if (!date) {
      setFormError('Informe a data do lançamento.')
      return
    }
    const amount = parseAmountInput(amountStr)
    if (amount == null || amount <= 0) {
      setFormError('Informe um valor maior que zero.')
      return
    }

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    setFormError('')
    const changedCategory = category !== tx.category
    updateTransaction(tx.id, {
      date,
      amount,
      category,
      // Escolha manual de categoria fica protegida contra a recategorização.
      ...(changedCategory ? { categorySource: 'manual' as const } : {}),
      status: (status || undefined) as TransactionStatus | undefined,
      note: note || undefined,
      tags: tagList,
    })

    // Aprende a regra quando a categoria foi alterada.
    if (learn && category !== tx.category) {
      addRule(tx.description, category)
    }
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Editar transação">
      <div className="tx-modal-summary">
        <strong>{tx.merchant}</strong>
        <span className="muted">{tx.description}</span>
        <div className="tx-modal-meta">
          <span>{formatDateBR(tx.date)}</span>
          <span className={`tx-type tx-${tx.type}`}>{tx.type === 'entrada' ? 'Entrada' : 'Saída'}</span>
          <span className="tx-amount">{formatBRL(tx.amount)}</span>
        </div>
      </div>

      <label className="field">
        <span className="field-label">Data</span>
        <input
          className="input"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">Valor</span>
        <input
          className="input"
          inputMode="decimal"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          placeholder="0,00"
        />
      </label>

      <label className="field">
        <span className="field-label">Categoria</span>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Classificação</span>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus | '')}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Tags (separadas por vírgula)</span>
        <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ex.: trabalho, viagem" />
      </label>

      <label className="field">
        <span className="field-label">Nota (anotação à margem)</span>
        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: jantar de aniversário" />
      </label>

      <label className="check">
        <input type="checkbox" checked={learn} onChange={(e) => setLearn(e.target.checked)} />
        <span>Aprender esta regra e aplicar em transações futuras parecidas</span>
      </label>

      {formError && <div className="error-box">{formError}</div>}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={save}>
          Salvar
        </button>
      </div>
    </Modal>
  )
}
