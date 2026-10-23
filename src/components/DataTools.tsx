import { useState } from 'react'
import { useFinance } from '../context/FinanceContext'
import { recoveryCopy, storageNotice } from '../lib/storage'
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function DataTools() {
  const { statements, transactions, rules, budgets, restoreBackup, clearAll } = useFinance()
  const [message, setMessage] = useState('')
  return (
    <section className="card section-gap">
      <h2>Backup e recuperação</h2>
      <p className="muted">Guarde uma cópia antes de trocar de navegador ou apagar os dados.</p>
      <div className="success-actions">
        <button
          className="btn btn-ghost"
          onClick={() =>
            download('caderneta-backup.json', {
              version: 2,
              statements,
              transactions,
              rules,
              budgets,
            })
          }
        >
          Exportar backup
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => download('caderneta-recuperacao.json', recoveryCopy())}
        >
          Exportar cópia de recuperação
        </button>
        {storageNotice() && (
          <button
            className="btn btn-danger-ghost"
            onClick={() => {
              if (
                confirm('Apagar os dados locais preservados? Exporte a cópia de recuperação antes.')
              )
                clearAll()
            }}
          >
            Limpar armazenamento inválido
          </button>
        )}
        <label className="field">
          Restaurar backup JSON
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              const input = e.currentTarget,
                file = input.files?.[0]
              if (!file) return
              try {
                if (file.size > 30 * 1024 * 1024) throw new Error('Backup maior que 30 MB.')
                const raw = JSON.parse(await file.text())
                if (
                  !confirm(
                    'Substituir os dados atuais pelo backup? Exporte uma cópia antes de continuar.',
                  )
                )
                  return
                restoreBackup(raw)
                setMessage('Backup restaurado.')
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Backup inválido.')
              } finally {
                input.value = ''
              }
            }}
          />
        </label>
      </div>
      <p role="status">{message}</p>
      {storageNotice() && (
        <p className="muted">
          A cópia de recuperação preserva o conteúdo bruto para análise, mesmo quando o backup
          normal não pode ser carregado.
        </p>
      )}
    </section>
  )
}
