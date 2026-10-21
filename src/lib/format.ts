// ============================================================================
// Formatação de moeda, datas e períodos (pt-BR)
// ============================================================================

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Formata um número como moeda brasileira: R$ 1.234,56 */
export function formatBRL(value: number): string {
  return brl.format(Number.isFinite(value) ? value : 0)
}

/** Formata sem o "R$", apenas o número: 1.234,56 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

/** Converte `yyyy-mm-dd` em `dd/mm/aaaa`. */
export function formatDateBR(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

/** Converte `yyyy-mm-dd` em `dd/mm`. */
export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!m || !d) return iso
  return `${d}/${m}`
}

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** `yyyy-mm` → `outubro de 2026` */
export function periodLabel(period: string): string {
  const [y, m] = period.split('-')
  const idx = parseInt(m, 10) - 1
  if (Number.isNaN(idx) || idx < 0 || idx > 11) return period
  return `${MONTHS[idx]} de ${y}`
}

/** `yyyy-mm` → `out/26` */
export function periodShort(period: string): string {
  const [y, m] = period.split('-')
  const idx = parseInt(m, 10) - 1
  const name = MONTHS[idx]?.slice(0, 3) ?? m
  return `${name}/${y?.slice(2)}`
}

/** Data ISO → `segunda-feira, 12/10`. */
export function formatWeekday(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' })
  return `${weekday}`
}

/** Gera um id curto e único. */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/** Retorna o período `yyyy-mm` de uma data ISO. */
export function periodOfDate(iso: string): string {
  return iso.slice(0, 7)
}
