import MiniSearch from 'minisearch'
import { computed, reactive } from 'vue'
import type { Meta, Parametro, Tela } from '../types'
import parametrosJson from './parametros.json'
import telasJson from './telas.json'
import metaJson from './meta.json'

export const parametros = parametrosJson as Parametro[]
export const telas = telasJson as Tela[]
export const meta = metaJson as Meta

export const porId = new Map<number, Parametro>(parametros.map((p) => [p.id, p]))
export const telaPorSlug = new Map<string, Tela>(telas.map((t) => [t.slug, t]))

/** Nome curto e legivel para exibir em listas (titulo amigavel > caption da tela > descricao). */
export function titulo(p: Parametro): string {
  return p.tituloAmigavel || p.caption || p.descricao
}

export function nomeTelaUso(unit: string, tela: string | null): string {
  if (tela) return tela
  return unit
    .replace(/^u(Frm|Fm|Dm|T)/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
}

/** Filtros globais (persistem enquanto a pagina estiver aberta). */
export const filtros = reactive({
  tipo: '' as '' | 'EMPRESA' | 'SISTEMA',
  mostrarLegado: false,
  versao: '' as string,
})

export function passaFiltro(p: Parametro): boolean {
  if (filtros.tipo && p.tipo !== filtros.tipo) return false
  if (!filtros.mostrarLegado && p.uso === 'LEGADO') return false
  if (filtros.versao && !p.versoes.includes(filtros.versao)) return false
  return true
}

export const totalVisivel = computed(() => parametros.filter(passaFiltro).length)

const indice = new MiniSearch<Parametro & { idTexto: string; telasUso: string; ajudaTexto: string }>({
  fields: ['idTexto', 'descricao', 'caption', 'tituloAmigavel', 'hint', 'ajudaTexto', 'explicacao', 'telasUso', 'grupo', 'tags'],
  storeFields: ['id'],
  idField: 'id',
  searchOptions: {
    boost: { idTexto: 10, descricao: 4, caption: 4, tituloAmigavel: 5, hint: 2, ajudaTexto: 1.5, telasUso: 1.5 },
    prefix: true,
    fuzzy: 0.15,
    combineWith: 'AND',
  },
  processTerm: (termo) =>
    termo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
  extractField: (doc, campo) => {
    const v = (doc as unknown as Record<string, unknown>)[campo]
    return Array.isArray(v) ? v.join(' ') : v == null ? '' : String(v)
  },
})

indice.addAll(
  parametros.map((p) => ({
    ...p,
    idTexto: String(p.id),
    telasUso: p.usos.map((u) => nomeTelaUso(u.unit, u.tela) + ' ' + u.unit).join(' '),
    ajudaTexto: p.ajuda ? `${p.ajuda.titulo} ${p.ajuda.resumo} ${p.ajuda.detalhamento}` : '',
  })),
)

export function buscar(texto: string, limite = 60): Parametro[] {
  const q = texto.trim()
  if (!q) return []
  // id exato primeiro
  const direto = /^\d+$/.test(q) ? porId.get(Number(q)) : undefined
  // MiniSearch devolve o id como string
  const resultados = indice.search(q).map((r) => porId.get(Number(r.id))!).filter(Boolean)
  const lista = direto ? [direto, ...resultados.filter((p) => p.id !== direto.id)] : resultados
  return lista.filter(passaFiltro).slice(0, limite)
}
