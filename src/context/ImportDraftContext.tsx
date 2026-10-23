import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFinance } from './FinanceContext'
import { emptyImportDraft, validPreviewRow, type ImportDraft } from '../lib/importDraft'
import { rawToTransaction } from '../lib/categorize'
import { parseAmountInput } from '../lib/format'
import { statementLabelFrom } from '../lib/normalize'
const KEY = 'caderneta:import-draft'
function readDraft(): ImportDraft {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return emptyImportDraft()
    const d = JSON.parse(raw) as ImportDraft
    if (
      !d ||
      !Array.isArray(d.preview) ||
      !Array.isArray(d.pending) ||
      !['fileName', 'bank', 'period', 'label'].every(
        (k) => typeof d[k as keyof ImportDraft] === 'string',
      ) ||
      !d.preview.every(
        (r) =>
          r &&
          typeof r.id === 'string' &&
          typeof r.date === 'string' &&
          typeof r.description === 'string' &&
          typeof r.amountStr === 'string' &&
          typeof r.category === 'string' &&
          ['entrada', 'saida'].includes(r.type),
      )
    )
      return emptyImportDraft()
    return d
  } catch {
    return emptyImportDraft()
  }
}
interface DraftValue {
  draft: ImportDraft
  setDraft: Dispatch<SetStateAction<ImportDraft>>
  saveDraft: () => string
  error: string
  setError: Dispatch<SetStateAction<string>>
}
const Context = createContext<DraftValue | null>(null)
export function ImportDraftProvider({ children }: { children: ReactNode }) {
  const { commitImport, rules } = useFinance()
  const [draft, setDraft] = useState(readDraft)
  const [error, setError] = useState('')
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const saving = useRef(false)
  const savedDraft = useRef<ImportDraft | null>(null)
  useEffect(() => {
    try {
      if (draft.preview.length) sessionStorage.setItem(KEY, JSON.stringify(draft))
      else sessionStorage.removeItem(KEY)
    } catch {
      setError(
        'Não foi possível guardar a revisão temporária. Conclua a importação antes de fechar a página.',
      )
    }
  }, [draft])
  function saveDraft(): string {
    if (!draft.preview.length || saving.current || savedDraft.current === draft) return ''
    if (!draft.preview.every(validPreviewRow))
      throw new Error(
        'Revise todas as linhas: data válida, descrição e valor maior que zero são obrigatórios. Sua revisão foi preservada.',
      )
    saving.current = true
    try {
      const transactions = draft.preview.map((row) => {
        const tx = rawToTransaction(
          { ...row, amount: parseAmountInput(row.amountStr)! },
          '',
          draft.bank,
          rules,
        )
        if (row.category !== tx.category) {
          tx.category = row.category
          tx.categorySource = 'manual'
        }
        return tx
      })
      const label = draft.label || statementLabelFrom(draft.fileName, draft.bank, draft.period)
      commitImport({
        label,
        bank: draft.bank,
        period: draft.period,
        fileName: draft.fileName,
        transactions,
        pendingInstallments: draft.pending,
      })
      savedDraft.current = draft
      setDraft(emptyImportDraft())
      setError('')
      return label
    } finally {
      saving.current = false
    }
  }
  // Trocar de página conclui uma revisão válida; erros mantêm o usuário na revisão.
  useEffect(() => {
    if (pathname === '/importar' || !draft.preview.length) return
    try {
      saveDraft()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar importação.')
      navigate('/importar', { replace: true })
    }
  }, [pathname, draft, commitImport, rules, navigate])
  return (
    <Context.Provider value={{ draft, setDraft, saveDraft, error, setError }}>
      {children}
    </Context.Provider>
  )
}
export function useImportDraft() {
  const value = useContext(Context)
  if (!value) throw new Error('ImportDraftProvider ausente')
  return value
}
export function useDraftField<K extends keyof ImportDraft>(
  key: K,
): [ImportDraft[K], Dispatch<SetStateAction<ImportDraft[K]>>] {
  const { draft, setDraft } = useImportDraft()
  return [
    draft[key],
    (value) =>
      setDraft((prev) => ({
        ...prev,
        [key]:
          typeof value === 'function'
            ? (value as (old: ImportDraft[K]) => ImportDraft[K])(prev[key])
            : value,
      })),
  ]
}
