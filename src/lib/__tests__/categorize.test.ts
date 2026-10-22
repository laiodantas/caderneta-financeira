// ============================================================================
// Testes da classificação automática.
// Cada caso é uma descrição real (fatura, extrato, dados de exemplo) ou um
// caso de risco conhecido (palavra que contém outra). Se um ajuste futuro nas
// palavras-chave quebrar um destes casos, o teste avisa.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { CATEGORY_KEYWORDS } from '../../config/categories'
import { categorize, categoryForSaved } from '../categorize'
import { normalizeDescription } from '../normalize'
import type { Transaction, TransactionType } from '../../types'

interface Case {
  description: string
  expected: string
  type?: TransactionType
}

const CASES: Case[] = [
  // Transporte e delivery
  { description: 'UBER *TRIP 1234', expected: 'transporte' },
  { description: 'DL*UberRides', expected: 'transporte' },
  { description: 'POP 09Set 12h10min', expected: 'transporte' },
  { description: 'POSTO SHELL SELECT', expected: 'transporte' },
  { description: 'ESTACIONAMENTO SHOPPING', expected: 'transporte' },
  { description: 'ONIBUS BH', expected: 'transporte' },

  // Restaurantes
  { description: 'Uber Eats', expected: 'restaurantes' },
  { description: 'iFood *Pedido', expected: 'restaurantes' },
  { description: 'IFD*VILANI ALVES 02615', expected: 'restaurantes' },
  { description: 'PADARIA PAO QUENTE', expected: 'restaurantes' },
  { description: 'VERANDA RESTAURANTE', expected: 'restaurantes' },
  { description: 'RAIANE CONFEITARIA', expected: 'restaurantes' },
  { description: 'RAIANE SALGADOS', expected: 'restaurantes' },
  { description: 'LA LUNA COMIDA', expected: 'restaurantes' },
  { description: 'O BAR E RESTAURANTE', expected: 'restaurantes' },
  { description: 'BOB S', expected: 'restaurantes' },
  { description: 'SUBWAY', expected: 'restaurantes' },
  { description: 'MC DONALDS', expected: 'restaurantes' },
  { description: 'CAFE CENTRAL', expected: 'restaurantes' },
  { description: 'FOOD TRUCK', expected: 'restaurantes' },
  { description: 'IFDSTORE', expected: 'restaurantes' },
  { description: 'IFD*VILANI ALVES', expected: 'restaurantes' },

  // Mercado
  { description: 'ASSAI ATACADISTA', expected: 'mercado' },
  { description: 'PAO DE ACUCAR', expected: 'mercado' },
  { description: 'FAVORITO SUPERMERCADOS', expected: 'mercado' },
  { description: 'CARREFOUR NTL 50', expected: 'mercado' },
  { description: 'OXXO CONVENIENCIA', expected: 'mercado' },
  { description: 'CONDOR SUPERMERCADO', expected: 'mercado' },
  { description: 'MERCADINHO DA ESQUINA', expected: 'mercado' },

  // Compras
  { description: 'MERCADOLIVRE', expected: 'compras' },
  { description: 'MERCADO LIVRE', expected: 'compras' },
  { description: 'AMAZON MARKETPLACE', expected: 'compras' },
  { description: 'SHOPEE', expected: 'compras' },
  { description: 'NETSHOES', expected: 'compras' },
  { description: 'SHOPPING IGUATEMI', expected: 'compras' },
  { description: 'ZARA HOME', expected: 'compras' },
  { description: 'HAVANA RESTAURANTE', expected: 'restaurantes' },

  // Assinaturas e serviços
  { description: 'NETFLIX.COM', expected: 'assinaturas' },
  { description: 'SPOTIFY BRASIL', expected: 'assinaturas' },
  { description: 'AMAZON PRIME VIDEO', expected: 'assinaturas' },
  { description: 'GOOGLE ONE', expected: 'assinaturas' },
  { description: 'XBOX GAME PASS', expected: 'assinaturas' },
  { description: 'APPLE.COM/BILL', expected: 'assinaturas' },
  { description: 'MICROSOFT 365', expected: 'assinaturas' },
  { description: 'OKEO', expected: 'assinaturas' },
  { description: 'DIGITALOCEAN.COM', expected: 'servicos_online' },
  { description: 'GOOGLE *CLOUD', expected: 'servicos_online' },
  { description: 'CHATGPT SUBSCRIPTION', expected: 'servicos_online' },

  // Saúde
  { description: 'DROGASIL', expected: 'saude' },
  { description: 'DROGA RAIA', expected: 'saude' },
  { description: 'SMARTFIT', expected: 'saude' },
  { description: 'GYMPASS', expected: 'saude' },
  { description: 'UNIMED RECIFE', expected: 'saude' },
  { description: 'FARMACIA SAO JOAO', expected: 'saude' },
  { description: 'CONSULTA MEDICA DR X', expected: 'saude' },

  // Contas fixas
  { description: 'ENEL DISTRIBUICAO', expected: 'contas_fixas' },
  { description: 'SABESP', expected: 'contas_fixas' },
  { description: 'VIVO FIBRA', expected: 'contas_fixas' },
  { description: 'ALUGUEL APTO', expected: 'contas_fixas' },
  { description: 'CLARO', expected: 'contas_fixas' },
  { description: 'TIM', expected: 'contas_fixas' },
  { description: 'SEGURO AUTO PORTO SEGURO', expected: 'contas_fixas' },
  { description: 'SEGURO DE VIDA', expected: 'contas_fixas' },

  // Tarifas, PIX e transferências
  { description: 'IOF CREDITO PARCELADO', expected: 'tarifas' },
  { description: 'ANUIDADE CARTAO', expected: 'tarifas' },
  { description: 'JUROS ROTATIVO', expected: 'tarifas' },
  { description: 'SAQUE 24H', expected: 'saques' },
  { description: 'PIX RECEBIDO JOAO', expected: 'pix_recebido', type: 'entrada' },
  { description: 'PIX ENVIADO JOAO', expected: 'pix_enviado' },
  { description: 'TED ENVIADA', expected: 'transferencias' },
  { description: 'PAGAMENTO FATURA CARTAO', expected: 'transferencias' },
  { description: 'MERCADO PAGO', expected: 'transferencias' },

  // Bares e lazer
  { description: 'BAR DO ZE', expected: 'bares_lazer' },
  { description: 'CINEMARK', expected: 'bares_lazer' },
  { description: 'STEAM PURCHASE', expected: 'bares_lazer' },

  // Educação
  { description: 'CURSO UDEMY', expected: 'educacao' },
  { description: 'RECUPERA UNP EAD', expected: 'educacao' },
  { description: 'EXPRESS PLAN*849965906', expected: 'educacao' },
  { description: 'CURSOS DE INGLES WIZARD', expected: 'educacao' },

  // Renda
  { description: 'SALARIO MENSAL', expected: 'renda', type: 'entrada' },
  { description: 'RENDIMENTO CDB', expected: 'renda', type: 'entrada' },
  { description: 'ESTORNO COMPRA LOJA', expected: 'renda', type: 'entrada' },
  { description: 'DEPOSITO FULANO', expected: 'renda', type: 'entrada' },

  // Extras e casos de risco
  { description: 'PACHECO JOSE', expected: 'extras' },
  { description: 'MARC TO NA PRACA', expected: 'extras' },
  { description: 'LOJA DO JOAO', expected: 'extras' },
  { description: 'SOCIEDADE CONDOR', expected: 'extras' },
  { description: 'PARCELA DO DIA 10', expected: 'extras' },
  { description: 'PAGAMENTO DIA 15', expected: 'extras' },
  { description: 'SOCIEDADE DISCURSO LTDA', expected: 'extras' },
  { description: 'ZARAGOZA TURISMO', expected: 'extras' },
  { description: 'AVONDALE IMOVEIS', expected: 'extras' },
  { description: 'TEMUCO TURISMO', expected: 'extras' },
  { description: 'CONSULTA SPC BRASIL', expected: 'extras' },
  { description: 'STONE PAGAMENTOS', expected: 'extras' },
  { description: 'CIELO VENDAS', expected: 'extras' },
  { description: 'XYZ COMERCIO', expected: 'extras' },
]

describe('categorize', () => {
  it.each(CASES)('$description → $expected', ({ description, expected, type }) => {
    expect(categorize(description, [], undefined, type)).toBe(expected)
  })

  it('não depende da ordem da lista de categorias', () => {
    // "Mercado Livre" precisa vencer "Mercado"; "Mercado Pago" precisa vencer
    // "Mercado" e cair em Transferências.
    expect(categorize('MERCADO LIVRE')).toBe('compras')
    expect(categorize('MERCADO PAGO')).toBe('transferencias')
  })

  it('usa a regra aprendida antes das palavras-chave', () => {
    const rules = [
      { id: 'r1', pattern: 'padaria pao quente', categoryId: 'mercado', createdAt: '' },
    ]
    expect(categorize('PADARIA PAO QUENTE', rules)).toBe('mercado')
  })
})

describe('CATEGORY_KEYWORDS', () => {
  it('remove duplicatas de acento dentro da mesma categoria', () => {
    const seen = new Set<string>()
    for (const { categoryId, keyword, wholeWord } of CATEGORY_KEYWORDS) {
      const key = `${categoryId}|${keyword}|${wholeWord}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it('mantém todas as palavras-chave configuradas (sem perder categorias)', () => {
    const ids = new Set(CATEGORY_KEYWORDS.map((k) => k.categoryId))
    expect(ids.has('transporte')).toBe(true)
    expect(ids.has('compras')).toBe(true)
    expect(ids.has('contas_fixas')).toBe(true)
  })
})

describe('categoryForSaved', () => {
  const base = (over: Partial<Transaction>): Transaction => ({
    id: 'x',
    date: '2026-09-24',
    description: 'MERCADO*MERCADOLIVRE (Parcela 01 de 10)',
    merchant: 'Mercado Livre',
    amount: 119.8,
    type: 'saida',
    category: 'mercado',
    statementId: 's',
    tags: [],
    ...over,
  })

  it('corrige categoria antiga usando o nome do estabelecimento', () => {
    expect(categoryForSaved(base({}), [])).toBe('compras')
  })

  it('preserva a identificação de Pix no crédito (que vem de uma tag)', () => {
    const tx = base({
      description: 'PIX CRED PARCELADO',
      merchant: 'A Da Silva Sil',
      tags: ['Pix no crédito'],
      category: 'extras',
    })
    expect(categoryForSaved(tx, [])).toBe('pix_enviado')
  })

  it('classifica IOF e 99pop salvos', () => {
    expect(
      categoryForSaved(
        base({ description: 'IOF CREDITO PARCELADO', merchant: 'IOF', category: 'extras' }),
        [],
      ),
    ).toBe('tarifas')
    expect(
      categoryForSaved(
        base({ description: 'POP 09Set 12h10min', merchant: '99pop', category: 'extras' }),
        [],
      ),
    ).toBe('transporte')
  })
})

describe('normalizeDescription com marcador de parcela', () => {
  it('remove parênteses vazios e o marcador de parcela do nome', () => {
    expect(normalizeDescription('NUBIA CAMELO DANTAS (Parcela 03 de 04)')).toBe(
      'Nubia Camelo Dantas',
    )
    expect(normalizeDescription('Recupera UNP EAD ( )')).toBe('Recupera Unp Ead')
  })
})
