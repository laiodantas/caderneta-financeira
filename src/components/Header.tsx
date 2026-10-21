// ============================================================================
// Cabeçalho: logo + navegação em pílulas + botão "+ Novo extrato"
// ============================================================================

import { Link, NavLink } from 'react-router-dom'
import { LogoMark } from './Illustrations'

const NAV = [
  { to: '/', label: 'Painel' },
  { to: '/categorias', label: 'Categorias' },
  { to: '/extrato', label: 'Extrato' },
  { to: '/importar', label: 'Importar' },
]

export function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          <LogoMark size={40} />
          <div className="logo-text">
            <span className="logo-word">Caderneta</span>
            <span className="logo-sub">Financeira</span>
          </div>
        </Link>

        <nav className="nav" aria-label="Navegação principal">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Link to="/importar" className="btn btn-primary btn-header">
          <span className="btn-plus">+</span> Novo extrato
        </Link>
      </div>
    </header>
  )
}
