// ============================================================================
// Normalização e limpeza de descrições
// ----------------------------------------------------------------------------
// Transforma descrições cruas ("UBER *TRIP 1234 SAO PAULO", "Uber do Brasil")
// em nomes de estabelecimento limpos ("Uber").
// ============================================================================

import { periodLabel } from './format'

/** Remove acentos e mantém minúsculas (para comparação). */
export function normalizeForMatch(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Mapa de apelidos → nome canônico do estabelecimento.
 * A chave é uma expressão regular (case-insensitive) aplicada à descrição
 * ORIGINAL. A ordem importa: o primeiro padrão que casar vence.
 * Edite para incluir os seus próprios comércios.
 */
const MERCHANT_ALIASES: Array<[RegExp, string]> = [
  // --- Transporte e delivery (específicos antes dos genéricos) --------------
  // "Uber Eats" precisa vir antes de "Uber"; "99Food" antes de "99".
  [/uber ?eats|ubereats/i, 'Uber Eats'],
  [/99 ?food|99food/i, '99Food'],
  [/uber/i, 'Uber'],
  [/^pop\s+\d{1,2}[a-z]{3}\s+\d{1,2}h\d{2}min/i, '99pop'],
  [/^99 ?pop|^pop\s+\d/i, '99pop'],
  [/99 ?app|99 ?taxi|^99 |\b99\b/i, '99'],
  [/ifood|ifd/i, 'iFood'],
  [/rappi/i, 'Rappi'],
  [/netflix/i, 'Netflix'],
  [/spotify/i, 'Spotify'],
  [/disney/i, 'Disney+'],
  [/amazon ?prime/i, 'Amazon Prime'],
  [/amazon/i, 'Amazon'],
  [/mercado ?livre|mercadolivre/i, 'Mercado Livre'],
  [/shopee/i, 'Shopee'],
  [/shein/i, 'Shein'],
  [/aliexpress/i, 'AliExpress'],
  [/magazine ?luiza|magalu/i, 'Magazine Luiza'],
  [/casas ?bahia/i, 'Casas Bahia'],
  [/mcdonald'?s|mc ?donalds/i, "McDonald's"],
  [/burger ?king/i, 'Burger King'],
  [/starbucks/i, 'Starbucks'],
  [/pão de açúcar|pao de acucar/i, 'Pão de Açúcar'],
  [/carrefour/i, 'Carrefour'],
  [/atacadão|atacadao/i, 'Atacadão'],
  [/assai|assaí/i, 'Assaí'],
  [/drogasil/i, 'Drogasil'],
  [/drogaraia|droga raia/i, 'Droga Raia'],
  [/pague ?menos/i, 'Pague Menos'],
  [/smartfit|smart fit/i, 'Smart Fit'],
  [/nubank/i, 'Nubank'],
  [/mercadopago|mercado pago/i, 'Mercado Pago'],
  [/outback/i, 'Outback'],
  [/bobs\b/i, "Bob's"],
  // --- Saúde e pets ---------------------------------------------------------
  [/unimed/i, 'Unimed'],
  [/amil\b/i, 'Amil'],
  [/bradesco ?saude/i, 'Bradesco Saúde'],
  [/hapvida/i, 'Hapvida'],
  [/cobasi/i, 'Cobasi'],
  [/petz/i, 'Petz'],
  [/petlove/i, 'Petlove'],
  // --- Contas e transporte ---------------------------------------------------
  [/sem ?parar/i, 'Sem Parar'],
  [/veloe/i, 'Veloe'],
  [/conectcar/i, 'ConectCar'],
  [/enel/i, 'Enel'],
  [/sabesp/i, 'Sabesp'],
  [/comgas/i, 'Comgás'],
  [/porto seguro/i, 'Porto Seguro'],
  [/vivo\b/i, 'Vivo'],
  [/claro\b/i, 'Claro'],
  [/tim\b/i, 'TIM'],
  [/\boi\b/i, 'Oi'],
  // --- Assinaturas, educação e serviços -------------------------------------
  [/okeo/i, 'Okeo'],
  [/digitalocean/i, 'DigitalOcean'],
  [/express plan/i, 'Express Plan'],
  [/alura/i, 'Alura'],
  [/udemy/i, 'Udemy'],
  [/coursera/i, 'Coursera'],
  [/rocketseat/i, 'Rocketseat'],
  [/openai|chatgpt/i, 'OpenAI'],
  [/anthropic|claude/i, 'Anthropic'],
  [/figma/i, 'Figma'],
  [/notion/i, 'Notion'],
]

/**
 * Remove artefatos de importação dos nomes: marcador de parcela ("(Parcela 03
 * de 04)") e parênteses vazios que sobram ("( )").
 */
export function cleanImportArtifacts(text: string): string {
  return (text || '')
    .replace(/\(?\s*\bparcela\s*\d{1,2}\s*(?:de|\/)\s*\d{1,2}\s*\)?/gi, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Limpa e normaliza uma descrição para exibição como "merchant".
 * - Remove números/CPF que não agregam (mantém apenas se necessário).
 * - Remove prefixos de banco comuns ("PIX ENVIADO PARA", "TED", "DOC").
 * - Aplica o mapa de apelidos.
 */
export function normalizeDescription(raw: string): string {
  if (!raw) return 'Sem descrição'

  let s = cleanImportArtifacts(raw)

  // Remove sufixos de cidade/estado que costumam sujar o nome (ex.: "SAO PAULO").
  s = s.replace(
    /\b(S(AO|ÃO)? PAULO|RIO DE JANEIRO|CURITIBA|BELO HORIZONTE|BRASILIA|BRASÍLIA|PORT[AO]? ALEGRE|RECIFE|SALVADOR|FORTALEZA|CAMPINAS)\b/gi,
    '',
  )

  // Remove sequências de números longas (IDs de corrida, CPF, etc.).
  s = s.replace(/\b\d{4,}\b/g, '')

  // Remove asteriscos e símbolos avulsos.
  s = s.replace(/[*#_]/g, ' ')

  // Colapsa espaços.
  s = s.replace(/\s+/g, ' ').trim()

  // Aplica apelidos.
  for (const [re, name] of MERCHANT_ALIASES) {
    if (re.test(s)) return name
  }

  // Capitaliza cada palavra (mantendo siglas como "iFood" já resolvidas acima).
  s = s
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_m, p1: string, p2: string) => p1 + p2.toUpperCase())

  return s || 'Sem descrição'
}

/** Heurística de título de extrato a partir do nome do arquivo + período. */
export function statementLabelFrom(fileName: string, bank: string, period: string): string {
  const base = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
  const month = period ? periodLabel(period) : ''
  const parts = [month, bank && bank !== 'Não identificado' ? `· ${bank}` : '']
    .filter(Boolean)
    .join(' ')
  return parts || base || 'Extrato importado'
}
