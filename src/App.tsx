// ============================================================================
// App: roteamento e layout global
// ============================================================================

import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { storageNotice } from './lib/storage'
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Categorias = lazy(() => import('./pages/Categorias').then((m) => ({ default: m.Categorias })))
const Extrato = lazy(() => import('./pages/Extrato').then((m) => ({ default: m.Extrato })))
const Importar = lazy(() => import('./pages/Importar').then((m) => ({ default: m.Importar })))

/** Sempre abre a página no topo, inclusive ao chegar por atalhos com filtro. */
function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, search])
  return null
}

export default function App() {
  const [notice, setNotice] = useState(storageNotice)
  useEffect(() => {
    const update = () => setNotice(storageNotice())
    window.addEventListener('caderneta:storage', update)
    return () => window.removeEventListener('caderneta:storage', update)
  }, [])
  return (
    <div className="app">
      <ScrollToTop />
      <Header />
      <main className="main">
        {notice && (
          <div role="alert" className="error-box container">
            {notice}
          </div>
        )}
        <Suspense
          fallback={
            <p className="container" role="status">
              Carregando…
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/extrato" element={<Extrato />} />
            <Route path="/importar" element={<Importar />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="footer">
        <span>🔒 Caderneta Financeira — seus dados ficam apenas no seu navegador.</span>
      </footer>
    </div>
  )
}
