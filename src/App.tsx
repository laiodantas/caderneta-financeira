// ============================================================================
// App: roteamento e layout global
// ============================================================================

import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { Dashboard } from './pages/Dashboard'
import { Categorias } from './pages/Categorias'
import { Extrato } from './pages/Extrato'
import { Importar } from './pages/Importar'

/** Sempre abre a página no topo, inclusive ao chegar por atalhos com filtro. */
function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, search])
  return null
}

export default function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/extrato" element={<Extrato />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
      <footer className="footer">
        <span>🔒 Caderneta Financeira — seus dados ficam apenas no seu navegador.</span>
      </footer>
    </div>
  )
}
