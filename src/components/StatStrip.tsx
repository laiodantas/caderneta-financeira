// ============================================================================
// Faixa de indicadores (ícone coral em linha fina + valor + legenda)
// ============================================================================

export interface StatItem {
  label: string
  value: string
  icon: 'in' | 'out' | 'balance'
  hint?: string
}

function StatIcon({ icon }: { icon: StatItem['icon'] }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  if (icon === 'in') {
    return (
      <svg {...common}>
        <path d="M12 3v12" />
        <path d="M6 11l6 6 6-6" />
        <path d="M4 21h16" />
      </svg>
    )
  }
  if (icon === 'out') {
    return (
      <svg {...common}>
        <path d="M12 21V9" />
        <path d="M6 13l6-6 6 6" />
        <path d="M4 3h16" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M3 7h18" />
      <path d="M6 7v10" />
      <path d="M9 7v7" />
      <path d="M12 7v10" />
      <path d="M15 7v7" />
      <path d="M18 7v10" />
    </svg>
  )
}

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div className="stat-strip">
      {items.map((item, i) => (
        <div className="stat" key={item.label}>
          {i > 0 && <span className="stat-divider" />}
          <span className="stat-icon">{<StatIcon icon={item.icon} />}</span>
          <div className="stat-body">
            <span className="stat-value">{item.value}</span>
            <span className="stat-label">
              {item.label}
              {item.hint && <span className="stat-hint"> · {item.hint}</span>}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
