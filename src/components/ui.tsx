// ============================================================================
// Componentes de UI compartilhados
// ============================================================================

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { formatBRL } from '../lib/format'

/** Título de seção: serifado itálico + sublinhado "feito à mão". */
export function SectionTitle({
  children,
  action,
  as: Tag = 'h2',
}: {
  children: ReactNode
  action?: ReactNode
  as?: 'h2' | 'h3'
}) {
  return (
    <div className="section-head">
      <div className="section-head-left">
        <Tag className="section-title">{children}</Tag>
        <Squiggle />
      </div>
      {action && <div className="section-head-action">{action}</div>}
    </div>
  )
}

/** Sublinhado ondulado em coral. */
export function Squiggle() {
  return (
    <svg className="squiggle" viewBox="0 0 64 8" fill="none" aria-hidden="true">
      <path
        d="M2 6 C 8 1, 14 1, 20 5 S 32 8, 38 4 S 50 2, 62 4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/** Tag arredondada (tons: coral, azul, neutro, verde). */
export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'coral' | 'blue' | 'neutral' | 'green'
}) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

/** Valor monetário grande. */
export function Money({ value, className = '' }: { value: number; className?: string }) {
  const negative = value < 0
  const abs = Math.abs(value)
  return (
    <span className={`money ${negative ? 'money-negative' : ''} ${className}`}>
      {negative ? '− ' : ''}
      {formatBRL(abs)}
    </span>
  )
}

/** Estado vazio bonito. */
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-desc">{description}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  )
}

/** Modal simples. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <h3 className="modal-title" id={titleId}>
            {title}
          </h3>
          <button ref={closeRef} className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

/** Ícone de seta/chevron discreto. */
export function Chevron() {
  return (
    <svg className="chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M6 3 L11 8 L6 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
