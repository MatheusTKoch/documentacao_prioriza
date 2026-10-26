/**
 * Varre os `.pas` de uma versao (somente leitura) e registra onde cada parametro e lido/gravado.
 * O nome amigavel da tela vem do `Caption` raiz do `.dfm` irmao da unit.
 */
import path from 'node:path'
import { existe, lerTexto, listarRecursivo } from './fs.ts'
import { parseDfm, propTexto } from './dfm.ts'

export interface UsoUnit {
  unit: string
  pasta: string
  tela: string | null
  tipo: 'form' | 'classe' | 'datamodule' | 'outro'
  leituras: number
  gravacoes: number
}

export type UsosPorId = Map<number, Map<string, UsoUnit>>

const RE_LEITURA = /\b(?:RetornaValorParametro(?:Empresa|Sistema)|MarcarPadraoPesquisa)\(\s*(\d+)\s*[,)]/g
const RE_GRAVACAO = /\bAlterarValorParametro(?:Empresa|Sistema)\(\s*(\d+)\s*,/g

export function tipoDaUnit(nome: string): UsoUnit['tipo'] {
  if (/^uFrm|^uFm|Form/i.test(nome)) return 'form'
  if (/^uDm/i.test(nome)) return 'datamodule'
  if (/^uT/i.test(nome)) return 'classe'
  return 'outro'
}

export function nomeAmigavelUnit(nome: string): string {
  return nome
    .replace(/^u(Frm|Fm|Dm|T)/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
}

function captionDoForm(caminhoPas: string): string | null {
  const dfm = caminhoPas.replace(/\.pas$/i, '.dfm')
  if (!existe(dfm)) return null
  try {
    const raiz = parseDfm(dfm)
    const cap = propTexto(raiz, 'Caption')
    return cap ? cap.replace(/\s+/g, ' ').trim() : null
  } catch {
    return null
  }
}

export function varrerUsos(raizFontes: string, unitIgnorada: string): { usos: UsosPorId; units: Map<string, UsoUnit> } {
  const usos: UsosPorId = new Map()
  const units = new Map<string, UsoUnit>()
  const arquivos = listarRecursivo(raizFontes, (p) => /\.pas$/i.test(p))

  for (const arq of arquivos) {
    const unit = path.basename(arq, path.extname(arq))
    if (unit.toLowerCase() === unitIgnorada.toLowerCase()) continue
    const texto = lerTexto(arq)
    if (!/Parametro/i.test(texto)) continue

    const contagem = new Map<number, { l: number; g: number }>()
    for (const m of texto.matchAll(RE_LEITURA)) {
      const id = Number(m[1])
      const c = contagem.get(id) ?? { l: 0, g: 0 }
      c.l++
      contagem.set(id, c)
    }
    for (const m of texto.matchAll(RE_GRAVACAO)) {
      const id = Number(m[1])
      const c = contagem.get(id) ?? { l: 0, g: 0 }
      c.g++
      contagem.set(id, c)
    }
    if (!contagem.size) continue

    const base: UsoUnit = {
      unit,
      pasta: path.basename(path.dirname(arq)),
      tela: captionDoForm(arq),
      tipo: tipoDaUnit(unit),
      leituras: 0,
      gravacoes: 0,
    }
    units.set(unit, base)
    for (const [id, c] of contagem) {
      if (!usos.has(id)) usos.set(id, new Map())
      usos.get(id)!.set(unit, { ...base, leituras: c.l, gravacoes: c.g })
    }
  }
  return { usos, units }
}

export function estatisticaArquivos(raizFontes: string): number {
  return listarRecursivo(raizFontes, (p) => /\.pas$/i.test(p)).length
}
