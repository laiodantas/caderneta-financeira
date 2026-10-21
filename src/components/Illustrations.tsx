// ============================================================================
// Ilustrações em SVG (estilo "desenho à mão" em linha azul-marinho + coral)
// ============================================================================

/** Marca/logo: quadrado azul-marinho com símbolo de caderno. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#1E2A4A" />
      {/* Caderno */}
      <rect x="11" y="13" width="26" height="24" rx="4" fill="#FFFFFF" />
      {/* Espiral */}
      {[16, 21, 26, 31].map((cx) => (
        <circle key={cx} cx={cx} cy="13" r="1.7" fill="#C74F3E" />
      ))}
      {/* Linhas */}
      <line x1="15" y1="21" x2="33" y2="21" stroke="#AFC0D0" strokeWidth="1.3" />
      <line x1="15" y1="26" x2="33" y2="26" stroke="#AFC0D0" strokeWidth="1.3" />
      <line x1="15" y1="31" x2="28" y2="31" stroke="#AFC0D0" strokeWidth="1.3" />
    </svg>
  )
}

/** Ilustração do caderno aberto com caneta (hero e estados vazios). */
export function NotebookIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 220"
      fill="none"
      className={className}
      role="img"
      aria-label="Caderno aberto com caneta"
    >
      {/* Capa atrás (navy) */}
      <rect
        x="30"
        y="40"
        width="216"
        height="146"
        rx="16"
        fill="#1E2A4A"
        transform="rotate(-4 138 113)"
        opacity="0.95"
      />
      {/* Página (branca) */}
      <rect x="42" y="34" width="196" height="140" rx="12" fill="#FFFFFF" stroke="#1E2A4A" strokeWidth="2.5" />

      {/* Espiral (parte de cima) */}
      {Array.from({ length: 15 }).map((_, i) => (
        <circle key={i} cx={52 + i * 13} cy={36} r={3} fill="none" stroke="#1E2A4A" strokeWidth="2" />
      ))}

      {/* Margem vertical (coral, sutil) */}
      <line x1="72" y1="46" x2="72" y2="164" stroke="#C74F3E" strokeWidth="1.6" opacity="0.5" />

      {/* Linhas pautadas */}
      {Array.from({ length: 8 }).map((_, i) => {
        const y = 60 + i * 14
        return <line key={i} x1="82" y1={y} x2="228" y2={y} stroke="#B9C6D3" strokeWidth="1.3" />
      })}

      {/* Rabisco de anotação (coral) */}
      <path d="M84 82 q8 -5 16 0 t16 0 t16 0" stroke="#C74F3E" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M84 110 q8 -5 16 0 t16 0" stroke="#C74F3E" strokeWidth="2.4" strokeLinecap="round" fill="none" />

      {/* Fita marcadora (coral) saindo por baixo */}
      <path d="M150 172 L150 202 L166 190 L150 178 Z" fill="#C74F3E" />

      {/* Caneta (diagonal) */}
      <g transform="rotate(-28 140 108)">
        <rect x="84" y="102" width="112" height="11" rx="5.5" fill="#1E2A4A" />
        <rect x="78" y="103" width="8" height="9" rx="2" fill="#C74F3E" />
        <path d="M70 107.5 L58 107.5 L70 104 L70 111 Z" fill="#1E2A4A" />
      </g>

      {/* Moedas (canto inferior direito) */}
      <circle cx="216" cy="150" r="9" fill="#E8B04B" stroke="#1E2A4A" strokeWidth="1.5" />
      <circle cx="206" cy="162" r="9" fill="#C74F3E" stroke="#1E2A4A" strokeWidth="1.5" opacity="0.9" />
    </svg>
  )
}
