// ============================================================================
// Gerador de dados de exemplo
// ----------------------------------------------------------------------------
// Usado apenas para demonstrar a interface quando ainda não há extrato.
// ============================================================================

import type { Statement, Transaction } from '../types'
import { uid } from './format'

interface SampleDef {
  merchant: string
  description: string
  category: string
  type: 'entrada' | 'saida'
  base: number
  spread: number
  perMonth: [number, number]
  /** Dias preferenciais do mês (1-28). */
  days: number[]
}

const SPENDERS: SampleDef[] = [
  {
    merchant: 'Uber',
    description: 'UBER *TRIP 1234',
    category: 'transporte',
    type: 'saida',
    base: 22,
    spread: 12,
    perMonth: [8, 14],
    days: [2, 4, 6, 9, 12, 15, 18, 21, 24, 27],
  },
  {
    merchant: 'iFood',
    description: 'iFood *Pedido',
    category: 'restaurantes',
    type: 'saida',
    base: 48,
    spread: 25,
    perMonth: [6, 10],
    days: [3, 5, 8, 11, 14, 17, 20, 23, 26],
  },
  {
    merchant: 'Padaria Pão Quente',
    description: 'PADARIA PAO QUENTE',
    category: 'restaurantes',
    type: 'saida',
    base: 18,
    spread: 8,
    perMonth: [4, 7],
    days: [1, 3, 6, 9, 12, 15, 18],
  },
  {
    merchant: 'Assaí',
    description: 'ASSAI ATACADISTA',
    category: 'mercado',
    type: 'saida',
    base: 320,
    spread: 90,
    perMonth: [2, 3],
    days: [5, 20],
  },
  {
    merchant: 'Pão de Açúcar',
    description: 'PAO DE ACUCAR',
    category: 'mercado',
    type: 'saida',
    base: 120,
    spread: 45,
    perMonth: [2, 4],
    days: [7, 15, 22, 27],
  },
  {
    merchant: 'Posto Shell',
    description: 'SHELL SELECT',
    category: 'transporte',
    type: 'saida',
    base: 180,
    spread: 40,
    perMonth: [1, 2],
    days: [8, 19],
  },
  {
    merchant: 'Netflix',
    description: 'NETFLIX.COM',
    category: 'assinaturas',
    type: 'saida',
    base: 55.9,
    spread: 0,
    perMonth: [1, 1],
    days: [10],
  },
  {
    merchant: 'Spotify',
    description: 'SPOTIFY BRASIL',
    category: 'assinaturas',
    type: 'saida',
    base: 21.9,
    spread: 0,
    perMonth: [1, 1],
    days: [12],
  },
  {
    merchant: 'Amazon Prime',
    description: 'AMAZON PRIME VIDEO',
    category: 'assinaturas',
    type: 'saida',
    base: 19.9,
    spread: 0,
    perMonth: [1, 1],
    days: [14],
  },
  {
    merchant: 'Drogasil',
    description: 'DROGASIL',
    category: 'saude',
    type: 'saida',
    base: 65,
    spread: 30,
    perMonth: [1, 2],
    days: [6, 18],
  },
  {
    merchant: 'Smart Fit',
    description: 'SMARTFIT',
    category: 'saude',
    type: 'saida',
    base: 129.9,
    spread: 0,
    perMonth: [1, 1],
    days: [5],
  },
  {
    merchant: 'Enel',
    description: 'ENEL DISTRIBUICAO',
    category: 'contas_fixas',
    type: 'saida',
    base: 210,
    spread: 50,
    perMonth: [1, 1],
    days: [9],
  },
  {
    merchant: 'Sabesp',
    description: 'SABESP',
    category: 'contas_fixas',
    type: 'saida',
    base: 95,
    spread: 20,
    perMonth: [1, 1],
    days: [11],
  },
  {
    merchant: 'Vivo Fibra',
    description: 'VIVO FIBRA',
    category: 'contas_fixas',
    type: 'saida',
    base: 119.9,
    spread: 0,
    perMonth: [1, 1],
    days: [13],
  },
  {
    merchant: 'Aluguel',
    description: 'ALUGUEL APTO',
    category: 'contas_fixas',
    type: 'saida',
    base: 1850,
    spread: 0,
    perMonth: [1, 1],
    days: [5],
  },
  {
    merchant: 'Mercado Livre',
    description: 'MERCADOLIVRE',
    category: 'compras',
    type: 'saida',
    base: 140,
    spread: 80,
    perMonth: [1, 3],
    days: [4, 16, 24],
  },
  {
    merchant: 'Shopee',
    description: 'SHOPEE',
    category: 'compras',
    type: 'saida',
    base: 70,
    spread: 40,
    perMonth: [1, 3],
    days: [2, 13, 25],
  },
  {
    merchant: 'Bar do Zé',
    description: 'BAR DO ZE',
    category: 'bares_lazer',
    type: 'saida',
    base: 85,
    spread: 45,
    perMonth: [2, 4],
    days: [6, 13, 20, 26],
  },
  {
    merchant: 'Cinemark',
    description: 'CINEMARK',
    category: 'bares_lazer',
    type: 'saida',
    base: 58,
    spread: 15,
    perMonth: [1, 2],
    days: [7, 21],
  },
]

const INCOME: SampleDef[] = [
  {
    merchant: 'Salário',
    description: 'SALARIO MENSAL',
    category: 'renda',
    type: 'entrada',
    base: 6500,
    spread: 0,
    perMonth: [1, 1],
    days: [5],
  },
  {
    merchant: 'PIX recebido — Aluguel',
    description: 'PIX RECEBIDO ALUGUEL',
    category: 'pix_recebido',
    type: 'entrada',
    base: 800,
    spread: 0,
    perMonth: [1, 1],
    days: [8],
  },
  {
    merchant: 'Freela',
    description: 'PIX RECEBIDO FREELA',
    category: 'pix_recebido',
    type: 'entrada',
    base: 600,
    spread: 400,
    perMonth: [0, 1],
    days: [15, 22],
  },
]

function rnd(base: number, spread: number): number {
  const v = base + (Math.random() * 2 - 1) * spread
  return Math.round(v * 100) / 100
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function monthAgo(offset: number): { period: string; year: number; month: number } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
  return {
    period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
  }
}

/** Gera um conjunto de exemplo (3 meses) para demonstração. */
export function generateSampleData(): { statements: Statement[]; transactions: Transaction[] } {
  const statements: Statement[] = []
  const transactions: Transaction[] = []

  for (let off = 2; off >= 0; off--) {
    const { period, year, month } = monthAgo(off)
    const statementId = uid()
    statements.push({
      id: statementId,
      label: `Demonstração — ${period.split('-')[1]}/${period.split('-')[0]}`,
      bank: 'Exemplo',
      period,
      importedAt: new Date().toISOString(),
      transactionCount: 0,
      fileName: 'dados-de-exemplo',
    })

    let count = 0
    const add = (def: SampleDef) => {
      const [min, max] = def.perMonth
      const n = min + Math.floor(Math.random() * (max - min + 1))
      const usedDays = new Set<number>()
      for (let i = 0; i < n; i++) {
        let day = pick(def.days)
        let guard = 0
        while (usedDays.has(day) && guard < 20) {
          day = ((day + 2) % 28) + 1
          guard++
        }
        usedDays.add(day)
        const dayPadded = String(day).padStart(2, '0')
        transactions.push({
          id: uid(),
          date: `${year}-${String(month).padStart(2, '0')}-${dayPadded}`,
          description: def.description,
          merchant: def.merchant,
          amount: rnd(def.base, def.spread),
          type: def.type,
          category: def.category,
          statementId,
          bank: 'Exemplo',
          tags: [],
        })
        count++
      }
    }

    SPENDERS.forEach(add)
    INCOME.forEach(add)

    const st = statements[statements.length - 1]
    st.transactionCount = count
  }

  return { statements, transactions }
}
