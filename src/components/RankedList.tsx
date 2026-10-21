// ============================================================================
// Lista de ranking (estilo "Quem deve há mais tempo"): posição, nome,
// detalhe, tag, valor alinhado à direita e chevron.
// ============================================================================

import { Chevron, Tag } from './ui'

export interface RankItem {
  id: string
  title: string
  subtitle?: string
  tag?: string
  value: string
  subvalue?: string
  /** Cor do marcador de posição (opcional). */
  color?: string
  onClick?: () => void
}

export function RankedList({
  items,
  emptyText = 'Nada por aqui ainda.',
}: {
  items: RankItem[]
  emptyText?: string
}) {
  if (!items.length) {
    return <p className="rank-empty">{emptyText}</p>
  }

  return (
    <ul className="rank-list">
      {items.map((item, i) => (
        <li key={item.id}>
          <button className="rank-item" onClick={item.onClick} disabled={!item.onClick}>
            <span className="rank-num" style={item.color ? { color: item.color } : undefined}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="rank-main">
              <span className="rank-name">{item.title}</span>
              {item.subtitle && <span className="rank-detail">{item.subtitle}</span>}
            </span>
            {item.tag && <Tag tone="coral">{item.tag}</Tag>}
            <span className="rank-right">
              <span className="rank-value">{item.value}</span>
              {item.subvalue && <span className="rank-subvalue">{item.subvalue}</span>}
            </span>
            <span className="rank-chevron">
              <Chevron />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
