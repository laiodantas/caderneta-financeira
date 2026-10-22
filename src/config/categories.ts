// ============================================================================
// CONFIGURAÇÃO DE CATEGORIAS
// ----------------------------------------------------------------------------
// Edite este arquivo para ajustar categorias, cores e palavras-chave.
// - `id`      : identificador estável (não mude se já houver dados salvos).
// - `name`    : nome exibido.
// - `color`   : cor usada nos gráficos e marcadores (hex).
// - `keywords`: termos em minúsculo E sem acento. A descrição é normalizada
//               (sem acento, minúscula) antes de comparar, então escreva
//               "transporte" e não "Transporte".
// - `budget`  : orçamento mensal padrão (opcional).
// ============================================================================

import type { Category } from '../types'

export const CATEGORIES: Category[] = [
  {
    id: 'transporte',
    name: 'Transporte',
    color: '#6C8AA8',
    keywords: [
      'uber', '99app', '99 app', '99 taxi', 'táxi', 'taxi', 'metrô', 'metro',
      '99pop', 'ônibus', 'onibus', 'combustível', 'combustivel', 'gasolina', 'etanol',
      'diesel', 'posto', 'pedágio', 'pedagio', 'estacionamento', 'parking',
      'shell', 'ipiranga', 'br mania', 'blablacar', 'moovit', 'estapar',
      'zona azul', 'recarga bilhete', 'bilhete unico', 'top',
    ],
    budget: 500,
  },
  {
    id: 'restaurantes',
    name: 'Restaurantes e delivery',
    color: '#C74F3E',
    keywords: [
      'ifood', 'ifd', 'uber eats', 'restaurante', 'lanchonete', 'lanches',
      'padaria', 'panificadora', 'pizzaria', 'sushi', 'hamburgueria',
      'mcdonalds', 'mcdonald', 'burger king', 'burgerking', 'subway',
      'dominos', 'kfc', 'giraffas', 'habib', 'spoleto', 'comida',
      'refeição', 'refeicao', 'cantina', 'self service', 'cafeteria',
      'starbucks', 'café', 'cafe', 'açaí', 'acai', 'sorvete', 'sorveteria',
      'gelateria', 'pastelaria', 'churrascaria', 'food', 'kitchen', 'delivery',
    ],
    budget: 600,
  },
  {
    id: 'bares_lazer',
    name: 'Bares e lazer',
    color: '#C99B3F',
    keywords: [
      'bar ', 'boteco', 'balada', 'boate', 'cinema', 'show', 'evento',
      'ingresso', 'teatro', 'parque', 'fliperama', 'boliche', 'sinuca',
      'bilheteria', 'ticketmaster', 'sympla', 'ingresso.com', 'festa',
      'chopp', 'cerveja', 'pub ', 'casa noturna', 'casa de show', 'net cine',
      'cine', 'cinepolis', 'cinemark', 'uol host', 'spotify live', 'rock',
    ],
    budget: 300,
  },
  {
    // Fica ANTES de "mercado" para que "Mercado Livre" caia em compras
    // (a palavra "mercado" sozinha não pode capturar marketplace/loja online).
    id: 'compras',
    name: 'Compras online e lojas',
    color: '#B5654A',
    keywords: [
      'mercado livre', 'mercadolivre', 'amazon', 'shopee', 'shein', 'aliexpress',
      'magalu', 'magazine luiza', 'americanas', 'casas bahia', 'renner', 'c&a',
      'cea ', 'riachuelo', 'zara', 'havan', 'netshoes', 'dafiti', 'paypal',
      'loja', 'compra', 'ecommerce', 'kalunga', 'centauro', 'decathlon',
      'leroy merlin', 'tok stok', 'mobly', 'madeira', 'oboticario', 'boticário',
      'livraria', 'saraiva', 'cultura ',
    ],
    budget: 500,
  },
  {
    id: 'mercado',
    name: 'Mercado e supermercado',
    color: '#7D9B76',
    keywords: [
      'mercado', 'supermercado', 'atacadão', 'atacadao', 'assai', 'atacadista',
      'hortifruti', 'hortifrúti', 'pao de acucar', 'pão de açúcar', 'carrefour',
      'extra ', 'gpa', 'dia ', 'dia%', 'covabra', 'sonda', 'oba ', 'emporio',
      'empório', 'quitanda', 'açougue', 'acougue', 'sacolao', 'sacolão',
      'big ', 'walmart', 'atacarejo', 'muffato', 'condor', 'bh ', 'veran',
      'super',
    ],
    budget: 1200,
  },
  {
    id: 'pix_enviado',
    name: 'PIX enviados',
    color: '#A98CA6',
    keywords: [
      'pix enviado', 'pix enviada', 'envio pix', 'pix transferido',
      'pix pago', 'pagamento pix', 'pix efetuado', 'transferencia pix enviada',
      'pix - envio', 'enviado via pix',
    ],
  },
  {
    id: 'pix_recebido',
    name: 'PIX recebidos',
    color: '#5E8B8B',
    keywords: [
      'pix recebido', 'pix recebida', 'recebimento pix', 'pix entrada',
      'transferencia recebida via pix', 'pix - recebimento', 'recebido via pix',
      'pix receb', 'pix creditado',
    ],
  },
  {
    id: 'transferencias',
    name: 'Transferências',
    color: '#8A9B6E',
    keywords: [
      'ted', 'doc ', 'transferência', 'transferencia', 'ted enviado',
      'doc enviado', 'transferência enviada', 'transferencia enviada',
      'ted recebido', 'doc recebido', 'transferência recebida',
      'transferencia recebida', 'transferencia pix', 'transferência pix',
    ],
  },
  {
    id: 'assinaturas',
    name: 'Assinaturas e streaming',
    color: '#9C8F5F',
    keywords: [
      'netflix', 'spotify', 'deezer', 'disney', 'prime video', 'amazon prime',
      'hbo', 'globoplay', 'paramount', 'youtube premium', 'youtube music',
      'google one', 'icloud', 'dropbox', 'adobe', 'canva', 'linkedin premium',
      'duolingo', 'assinatura', 'mensalidade', 'plano', 'app store',
      'google play', 'apple.com/bill', 'microsoft', 'office 365', 'xbox',
      'playstation plus', 'ps plus', 'game pass', 'crunchyroll', 'twitch',
      'okeo',
    ],
    budget: 150,
  },
  {
    id: 'educacao',
    name: 'Educação e cursos',
    color: '#5B7FA6',
    keywords: [
      'ead ', 'unp ', 'curso', 'cursos', 'cursinho', 'faculdade', 'universidade',
      'escola', 'colégio', 'colegio', 'express plan', 'plataforma de estudo',
      'matrícula', 'matricula', 'mensalidade escolar', 'certificado',
    ],
    budget: 400,
  },
  {
    id: 'servicos_online',
    name: 'Serviços online e cloud',
    color: '#7A6FA8',
    keywords: [
      'digitalocean', 'aws', 'amazon web services', 'azure', 'google cloud',
      'vps', 'hosting', 'servidor', 'cloud', 'github', 'vercel', 'netlify',
      'notion', 'openai', 'chatgpt', 'anthropic',
    ],
    budget: 200,
  },
  {
    id: 'saude',
    name: 'Saúde e farmácia',
    color: '#D98A8A',
    keywords: [
      'farmácia', 'farmacia', 'drogaria', 'drogasil', 'pacheco', 'raia',
      'pague menos', 'sp drogas', 'são paulo', 'droga', 'consulta', 'médico',
      'medico', 'dentista', 'psicologo', 'psicólogo', 'plano de saúde',
      'plano de saude', 'clinica', 'clínica', 'hospital', 'laboratorio',
      'laboratório', 'exame', 'odontologia', 'fisioterapia', 'academia',
      'smartfit', 'gym', 'farma', 'veterinário', 'veterinario', 'petlove',
      'petz', 'ótica', 'otica', 'óculos', 'oculos', 'lentes',
    ],
    budget: 400,
  },
  {
    id: 'contas_fixas',
    name: 'Contas fixas',
    color: '#1E2A4A',
    keywords: [
      'aluguel', 'condominio', 'condomínio', 'luz', 'energia', 'enel', 'cpfl',
      'cemig', 'eletropaulo', 'equatorial', 'água', 'agua', 'sabesp', 'sanepar',
      'copasa', 'corsan', 'gás', 'gas natural', 'comgas', 'ultragaz', 'internet',
      'vivo', 'claro', 'tim ', 'oi ', 'net ', 'operadora', 'telefone', 'celular',
      'tv a cabo', 'iptu', 'conta de', 'fatura', 'boleto de', 'seguro de vida',
      'plano de saúde', 'financiamento', 'prestação', 'prestacao', 'escola',
      'faculdade', 'mensalidade escolar',
    ],
    budget: 2500,
  },
  {
    id: 'tarifas',
    name: 'Tarifas e taxas',
    color: '#C9A87C',
    keywords: [
      'tarifa', 'taxa', 'anuidade', 'iof', 'juros', 'manutenção', 'manutencao',
      'pacote de serviços', 'pacote de servicos', 'cesta de serviços',
      'mensalidade banco', 'seguro', 'multa', 'encargo', 'juros de mora',
    ],
  },
  {
    id: 'saques',
    name: 'Saques',
    color: '#8B8B9A',
    keywords: [
      'saque', 'caixa eletronico', 'caixa eletrônico', 'atm', 'banco24horas',
      'banco 24 horas', 'saque 24h', 'caixa 24 horas',
    ],
  },
  {
    id: 'extras',
    name: 'Extras / Outros',
    color: '#9AA0A6',
    // Categoria "coringa": recebe tudo que não casou com nenhuma acima.
    keywords: [],
  },
]

/** Busca rápida de categoria por id. */
export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
)

/** id da categoria usada como fallback. */
export const DEFAULT_CATEGORY = 'extras'

/** Cor de uma categoria (com fallback para o cinza do "Extras"). */
export function categoryColor(id: string): string {
  return CATEGORY_MAP[id]?.color ?? '#9AA0A6'
}

/** Nome de uma categoria (com fallback). */
export function categoryName(id: string): string {
  return CATEGORY_MAP[id]?.name ?? 'Extras / Outros'
}
