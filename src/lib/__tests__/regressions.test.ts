import { validPreviewRow } from '../importDraft'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseCSV } from '../parser/csv'
import { parseOFX } from '../parser/ofx'
import { parseFatura } from '../parser/fatura'
import { extractFromText } from '../parser/text'
import { parseAmountInput } from '../format'
import { buildRuleFrom, categorize } from '../categorize'
import { compareMonths, duplicates, installmentPlans } from '../insights'
import {
  clearAllData,
  loadTransactions,
  saveSnapshot,
  validateSnapshot,
  type Snapshot,
} from '../storage'
import type { Transaction } from '../../types'

const tx = (patch: Partial<Transaction> = {}): Transaction => ({
  id: 't',
  date: '2026-10-01',
  description: 'Loja',
  merchant: 'Loja',
  amount: 100,
  type: 'saida',
  category: 'compras',
  statementId: 's',
  tags: [],
  ...patch,
})
const snapshot = (): Snapshot => ({
  version: 2,
  statements: [
    {
      id: 's',
      label: 'Teste',
      bank: 'Banco',
      period: '2026-10',
      importedAt: '',
      transactionCount: 1,
    },
  ],
  transactions: [tx()],
  rules: [],
  budgets: {},
})

describe('importação e moeda', () => {
  it.each([
    ['D', 'saida'],
    ['d', 'saida'],
    ['C', 'entrada'],
    ['c', 'entrada'],
  ])('reconhece tipo CSV %s', (type, expected) => {
    expect(parseCSV(`Data;Descricao;Valor;Tipo\n01/10/2026;Loja;100,00;${type}`)[0].type).toBe(
      expected,
    )
  })
  it('diferencia CSV de conta e cartão', () => {
    const csv = 'Data;Descricao;Valor\n01/10/2026;Joao;100,00'
    expect(parseCSV(csv)[0].type).toBe('entrada')
    expect(parseCSV(csv, 'card')[0].type).toBe('saida')
  })
  it.each(['1234,56', '1.234,56', '1234.56'])('preserva o valor inteiro %s em fatura', (value) => {
    const result = parseFatura([
      {
        text: 'Despesas da fatura',
        rows: [
          {
            y: 100,
            cells: [
              { x: 10, text: 'Data' },
              { x: 150, text: 'Movimentação' },
              { x: 300, text: 'Beneficiário' },
              { x: 500, text: 'Valor' },
            ],
          },
          {
            y: 80,
            cells: [
              { x: 10, text: '01/10/2026' },
              { x: 150, text: 'Loja' },
              { x: 500, text: value },
            ],
          },
        ],
      },
    ])
    expect(result.transactions[0].amount).toBe(1234.56)
  })
  it.each(['', '100abc', '1,2,3', 'Infinity', '1.23.45'])('rejeita moeda inválida %s', (value) =>
    expect(parseAmountInput(value)).toBeNull(),
  )
  it('aceita moeda brasileira válida', () => expect(parseAmountInput('R$ 1.234,56')).toBe(1234.56))
  it('lê OFX SGML e XML', () => {
    expect(
      parseOFX('<STMTTRN><DTPOSTED>20261001\n<TRNAMT>-100.00\n<MEMO>Loja\n</STMTTRN>')[0],
    ).toMatchObject({ date: '2026-10-01', amount: 100, type: 'saida', description: 'Loja' })
    expect(
      parseOFX(
        '<STMTTRN><DTPOSTED>20261001</DTPOSTED><TRNAMT>100.00</TRNAMT><MEMO>Loja</MEMO></STMTTRN>',
      )[0].type,
    ).toBe('entrada')
  })
  it('não usa saldo como despesa', () => {
    expect(extractFromText('01/10/2026 Compra Loja -100,00 900,00')[0]).toMatchObject({
      amount: 100,
      description: 'Compra Loja',
      type: 'saida',
    })
    expect(
      extractFromText('Data Descricao Valor Saldo\n01/10/2026 Compra Loja 100,00 900,00')[0].amount,
    ).toBe(100)
  })
  it('sinaliza linha monetária ambígua', () =>
    expect(() => extractFromText('01/10/2026 Compra Loja 100,00 900,00')).toThrow('vários valores'))
})

describe('validação adicional de importação', () => {
  it('preserva descrições CSV com quebras de linha entre aspas', () =>
    expect(parseCSV('Data;Descricao;Valor\n01/10/2026;"Loja\nCentro";100,00')[0].description).toBe(
      'Loja\nCentro',
    ))
  it('não descarta valor ausente no CSV', () =>
    expect(() => parseCSV('Data;Descricao;Valor\n01/10/2026;Loja;')).toThrow('Valor ausente'))
  it('não descarta valor inválido no OFX', () =>
    expect(() => parseOFX('<STMTTRN><TRNAMT>abc</TRNAMT></STMTTRN>')).toThrow('inválido'))
  it('estorno de cartão negativo é entrada', () =>
    expect(parseCSV('Data;Descricao;Valor\n01/10/2026;Loja;-100,00', 'card')[0].type).toBe(
      'entrada',
    ))
})

describe('regras e indicadores', () => {
  it('a correção mais recente vence', () =>
    expect(
      categorize('Loja', [buildRuleFrom('Loja', 'compras'), buildRuleFrom('Loja', 'saude')]),
    ).toBe('saude'))
  it('não agrupa estorno com débito como duplicata', () =>
    expect(duplicates([tx(), tx({ id: 'b', type: 'entrada' })])).toHaveLength(0))
  it('não compara meses não consecutivos', () =>
    expect(
      compareMonths([tx({ date: '2026-08-01' }), tx({ id: 'b', amount: 200 })])?.changePct,
    ).toBeNull())
  it('separa planos por valor e origem temporal', () => {
    expect(
      installmentPlans([
        tx({ installment: { current: 1, total: 3 } }),
        tx({ id: 'b', amount: 200, installment: { current: 1, total: 3 } }),
        tx({ id: 'c', date: '2026-09-01', installment: { current: 1, total: 3 } }),
      ]),
    ).toHaveLength(3)
  })
  it('une parcelas sucessivas e zera restante na última', () => {
    const plans = installmentPlans([
      tx({ date: '2026-08-01', installment: { current: 1, total: 3 } }),
      tx({ id: 'b', installment: { current: 3, total: 3 } }),
    ])
    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({ remaining: 0, paid: 200, progress: 100 })
  })
})

describe('persistência e recuperação', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    })
    clearAllData()
  })
  afterEach(() => vi.unstubAllGlobals())
  it('grava e recupera o conjunto completo', () => {
    saveSnapshot(snapshot(), true)
    expect(loadTransactions()).toEqual([tx()])
  })
  it('falha de quota é propagada', () => {
    localStorage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(() => saveSnapshot(snapshot(), true)).toThrow('Não foi possível salvar')
  })
  it('rejeita dados inválidos e referências órfãs', () => {
    expect(() => validateSnapshot({ ...snapshot(), transactions: null })).toThrow()
    expect(() =>
      validateSnapshot({ ...snapshot(), transactions: [tx({ statementId: 'inexistente' })] }),
    ).toThrow()
    expect(() =>
      validateSnapshot({ ...snapshot(), transactions: [tx({ date: '2026-02-31' })] }),
    ).toThrow()
  })
  it('preserva dados corrompidos e bloqueia gravação automática', () => {
    localStorage.setItem('caderneta:snapshot', 'null')
    expect(loadTransactions()).toEqual([])
    expect(() => saveSnapshot(snapshot())).toThrow()
    expect(localStorage.getItem('caderneta:snapshot')).toBe('null')
    saveSnapshot(snapshot(), true)
    expect(loadTransactions()).toEqual([tx()])
  })
})

describe('validação da revisão preservada', () => {
  const row = {
    id: 'row',
    date: '2026-09-01',
    description: 'Compra',
    amountStr: '12,50',
    category: 'compras',
    type: 'saida' as const,
  }
  it('aceita uma linha válida para salvar ao navegar', () =>
    expect(validPreviewRow(row)).toBe(true))
  it.each([{ date: '' }, { date: '2026-02-31' }, { amountStr: 'abc' }, { description: '' }])(
    'impede navegação com linha inválida %j',
    (patch) => expect(validPreviewRow({ ...row, ...patch })).toBe(false),
  )
})
