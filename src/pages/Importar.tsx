// ============================================================================
// Importar: upload de PDF/CSV/OFX, OCR automático, pré-visualização editável
// e confirmação. Inclui histórico de extratos e regras aprendidas.
// ============================================================================

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import { parseFile } from '../lib/parser'
import { categorize, rawToTransaction } from '../lib/categorize'
import { CATEGORIES } from '../config/categories'
import { BANKS } from '../config/banks'
import { statementLabelFrom } from '../lib/normalize'
import { periodLabel, uid } from '../lib/format'
import { SectionTitle, Tag } from '../components/ui'
import { NotebookIllustration } from '../components/Illustrations'
import type { RawTransaction, Transaction, PendingInstallment } from '../types'

interface PreviewRow {
  id: string
  date: string
  description: string
  amountStr: string
  type: 'entrada' | 'saida'
  category: string
  /** Texto usado na categorização (vem do parser). */
  categoryHint?: string
  /** Parcela X de Y, quando a compra é parcelada. */
  installment?: { current: number; total: number }
}

export function Importar() {
  const { rules, statements, transactions, commitImport, deleteStatement, deleteRule, loadSample, clearAll } =
    useFinance()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [fileName, setFileName] = useState('')
  const [bank, setBank] = useState('')
  const [period, setPeriod] = useState('')
  const [label, setLabel] = useState('')
  const [source, setSource] = useState<'pdf' | 'csv' | 'ofx'>('pdf')
  const [ocrUsed, setOcrUsed] = useState(false)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [pending, setPending] = useState<PendingInstallment[]>([])
  const [imported, setImported] = useState<string | null>(null)

  const canImport = preview.length > 0

  async function handleFile(file: File) {
    setError(null)
    setImported(null)
    setBusy(true)
    setProgress('Lendo o arquivo…')
    setPreview([])

    try {
      const res = await parseFile(file, setProgress)
      const rows: PreviewRow[] = res.transactions.map((raw) => ({
        id: uid(),
        date: raw.date,
        description: raw.description,
        amountStr: raw.amount.toFixed(2).replace('.', ','),
        type: raw.type,
        category: categorize(raw.description, rules, raw.categoryHint),
        categoryHint: raw.categoryHint,
        installment: raw.installment,
      }))
      const detectedPeriod = detectPeriod(res.transactions)

      setFileName(file.name)
      setBank(res.bank)
      setPeriod(detectedPeriod)
      setLabel(statementLabelFrom(file.name, res.bank, detectedPeriod))
      setSource(res.source)
      setOcrUsed(Boolean(res.ocrUsed))
      setPending(res.pendingInstallments ?? [])
      setPreview(rows)

      if (!rows.length) {
        setError(
          'Não consegui identificar transações neste arquivo. Confira se é um extrato válido (PDF, CSV ou OFX) e tente novamente.',
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.')
    } finally {
      setBusy(false)
    }
  }

  function confirmImport() {
    const txs: Transaction[] = []
    for (const row of preview) {
      const amount = parseFloat(row.amountStr.replace(/\./g, '').replace(',', '.'))
      if (!Number.isFinite(amount) || amount <= 0) continue
      if (!row.description.trim()) continue
      const tx = rawToTransaction(
        {
          date: row.date,
          description: row.description,
          amount,
          type: row.type,
          categoryHint: row.categoryHint,
          installment: row.installment,
        },
        '',
        bank,
        rules,
      )
      tx.category = row.category // respeita a escolha do usuário na pré-visualização
      txs.push(tx)
    }

    commitImport({
      label: label || statementLabelFrom(fileName, bank, period),
      bank,
      period,
      fileName,
      transactions: txs,
      pendingInstallments: pending,
    })
    setImported(label || fileName)
    setPreview([])
  }

  function reset() {
    setPreview([])
    setPending([])
    setFileName('')
    setError(null)
    setImported(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="container page">
      <div className="page-top">
        <div>
          <h1 className="page-title">Importar extrato</h1>
          <p className="page-subtitle">PDF, CSV ou OFX · leitura no seu navegador</p>
        </div>
      </div>

      {/* Privacidade */}
      <div className="privacy-note">
        <span className="privacy-icon">🔒</span>
        <span>
          Tudo é processado <strong>localmente no seu navegador</strong>. Seus dados bancários
          nunca são enviados para servidores externos.
        </span>
      </div>

      {/* Upload */}
      {!preview.length && (
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const f = e.dataTransfer.files?.[0]
            if (f) handleFile(f)
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.csv,.ofx,.qif"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
          <NotebookIllustration className="upload-illustration" />
          <h2 className="upload-title">Jogue seu extrato aqui</h2>
          <p className="upload-desc">
            Arraste e solte ou clique para escolher um arquivo.
          </p>
          <button className="btn btn-primary" type="button">
            Escolher arquivo
          </button>
          <span className="upload-formats">PDF · CSV · OFX</span>
        </div>
      )}

      {/* Progresso */}
      {busy && (
        <div className="card progress-card">
          <div className="spinner" />
          <span>{progress || 'Processando…'}</span>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="error-box">
          <strong>Ops!</strong> {error}
        </div>
      )}

      {/* Pré-visualização */}
      {canImport && !busy && (
        <div className="preview">
          <div className="card meta-card">
            <div className="meta-grid">
              <label className="field">
                <span className="field-label">Banco</span>
                <select className="input" value={bank} onChange={(e) => setBank(e.target.value)}>
                  {!BANKS.some((b) => b.name === bank) && <option value={bank}>{bank}</option>}
                  {BANKS.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Período</span>
                <input
                  className="input"
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Rótulo</span>
                <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
              </label>
            </div>
            <div className="meta-info">
              {source.toUpperCase()} · {preview.length} transações{' '}
              {ocrUsed && <Tag tone="blue">OCR usado</Tag>}
              {pending.length > 0 && (
                <Tag tone="green">{pending.length} parcelas a cobrar</Tag>
              )}
            </div>
          </div>

          <SectionTitle>Revise antes de confirmar</SectionTitle>
          <div className="card table-card">
            <div className="table-scroll">
              <table className="table preview-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Categoria</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          className="input input-sm"
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRow(i, { date: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input input-sm"
                          value={row.description}
                          onChange={(e) => updateRow(i, { description: e.target.value })}
                        />
                        {row.installment && (
                          <span className="preview-tag">
                            Parcela {row.installment.current}/{row.installment.total}
                          </span>
                        )}
                      </td>
                      <td>
                        <select
                          className="input input-sm"
                          value={row.type}
                          onChange={(e) => updateRow(i, { type: e.target.value as 'entrada' | 'saida' })}
                        >
                          <option value="saida">Saída</option>
                          <option value="entrada">Entrada</option>
                        </select>
                      </td>
                      <td>
                        <input
                          className="input input-sm"
                          inputMode="decimal"
                          value={row.amountStr}
                          onChange={(e) => updateRow(i, { amountStr: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="input input-sm"
                          value={row.category}
                          onChange={(e) => updateRow(i, { category: e.target.value })}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button className="row-btn" aria-label="Remover" onClick={() => removeRow(i)}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="preview-actions">
            <button className="btn btn-ghost" onClick={reset}>
              Descartar
            </button>
            <button className="btn btn-primary" onClick={confirmImport}>
              Confirmar importação ({preview.length})
            </button>
          </div>
        </div>
      )}

      {/* Sucesso */}
      {imported && (
        <div className="card success-banner">
          <div>
            <strong>Extrato importado!</strong>
            <p className="muted">“{imported}” já está na sua caderneta.</p>
          </div>
          <div className="success-actions">
            <button className="btn btn-ghost" onClick={reset}>
              Importar outro
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/extrato')}>
              Ver extrato →
            </button>
          </div>
        </div>
      )}

      {/* Histórico e regras */}
      <div className="grid-2 section-gap">
        <div className="card">
          <SectionTitle>Histórico de extratos</SectionTitle>
          {statements.length === 0 ? (
            <p className="rank-empty">Nenhum extrato importado ainda.</p>
          ) : (
            <ul className="history-list">
              {statements.map((s) => (
                <li key={s.id} className="history-row">
                  <div className="history-main">
                    <span className="history-label">{s.label}</span>
                    <span className="history-detail">
                      {periodLabel(s.period)} · {s.transactionCount} lançamentos · {s.bank}
                    </span>
                  </div>
                  <button
                    className="row-btn"
                    aria-label="Excluir extrato"
                    onClick={() => {
                      if (confirm(`Excluir o extrato "${s.label}" e todos os seus lançamentos?`))
                        deleteStatement(s.id)
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <SectionTitle>Regras aprendidas</SectionTitle>
          {rules.length === 0 ? (
            <p className="rank-empty">
              Ao corrigir uma categoria, a Caderneta aprende a regra automaticamente.
            </p>
          ) : (
            <ul className="rules-list">
              {rules.map((r) => (
                <li key={r.id} className="rules-row">
                  <span className="rules-pattern">“{r.pattern}”</span>
                  <span className="rules-arrow">→</span>
                  <span className="rules-cat">{CATEGORIES.find((c) => c.id === r.categoryId)?.name ?? r.categoryId}</span>
                  <button className="row-btn" aria-label="Remover regra" onClick={() => deleteRule(r.id)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Dados de exemplo / limpar */}
      <div className="card section-gap demo-card">
        <div>
          <strong>Sem extrato à mão?</strong>
          <p className="muted">Carregue dados de exemplo para explorar a interface.</p>
        </div>
        <div className="success-actions">
          <button className="btn btn-ghost" onClick={loadSample}>
            Carregar exemplo
          </button>
          {transactions.length > 0 && (
            <button
              className="btn btn-danger-ghost"
              onClick={() => {
                if (confirm('Apagar TODOS os dados da caderneta? Essa ação não pode ser desfeita.')) clearAll()
              }}
            >
              Apagar tudo
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ---- helpers locais ------------------------------------------------------
  function updateRow(i: number, patch: Partial<PreviewRow>) {
    setPreview((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function removeRow(i: number) {
    setPreview((prev) => prev.filter((_, idx) => idx !== i))
  }
}

function detectPeriod(raw: RawTransaction[]): string {
  const counts = new Map<string, number>()
  for (const r of raw) {
    if (!r.date) continue
    const p = r.date.slice(0, 7)
    counts.set(p, (counts.get(p) ?? 0) + 1)
  }
  if (counts.size) {
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  }
  return new Date().toISOString().slice(0, 7)
}
