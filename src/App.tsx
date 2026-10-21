// ============================================================================
// App: roteamento e layout global
// ============================================================================

import { Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Dashboard } from './pages/Dashboard'
import { Categorias } from './pages/Categorias'
import { Extrato } from './pages/Extrato'
import { Importar } from './pages/Importar'

export default function App() {
  return (
    <div className="app">
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
