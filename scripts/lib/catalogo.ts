/**
 * Leitor do catalogo `PARAMETROS.parametro` (UTF-8, colunas separadas por TAB).
 *
 *   # TELA: Geral                 -> abre um grupo
 *   # comentario do parametro      -> linha imediatamente acima do registro
 *   4<TAB>DESCRICAO<TAB>TIPO<TAB>USO<TAB>ONDE
 */
import { lerTexto } from './fs.ts'

export interface ParametroCatalogo {
  id: number
  descricao: string
  tipo: string
  uso: string
  onde: string
  grupo: string
  comentario: string | null
}

export interface GrupoCatalogo {
  nome: string
  descricao: string | null
  ids: number[]
}

export interface Catalogo {
  parametros: ParametroCatalogo[]
  grupos: GrupoCatalogo[]
  proximoIdLivre: number | null
}

export function lerCatalogo(caminho: string): Catalogo {
  const linhas = lerTexto(caminho).split(/\r?\n/)
  const parametros: ParametroCatalogo[] = []
  const grupos: GrupoCatalogo[] = []
  let grupoAtual: GrupoCatalogo | null = null
  let comentarioPendente: string | null = null
  let proximoIdLivre: number | null = null

  for (const bruta of linhas) {
    const linha = bruta.trimEnd()
    if (!linha.trim()) {
      comentarioPendente = null
      continue
    }
    const tela = /^#\s*TELA:\s*(.+)$/.exec(linha)
    if (tela) {
      grupoAtual = { nome: tela[1].trim(), descricao: null, ids: [] }
      grupos.push(grupoAtual)
      comentarioPendente = null
      continue
    }
    const prox = /^#\s*Proximo ID livre[^:]*:\s*(\d+)/i.exec(linha)
    if (prox) proximoIdLivre = Number(prox[1])

    if (linha.startsWith('#')) {
      const texto = linha.replace(/^#\s?/, '').trim()
      if (/^=+$/.test(texto) || !texto) continue
      if (grupoAtual && grupoAtual.descricao === null && grupoAtual.ids.length === 0 && !/^IDs?:/i.test(texto)) {
        grupoAtual.descricao = texto
        continue
      }
      comentarioPendente = texto
      continue
    }

    let cols = linha.split('\t')
    // tolerancia: linha com colunas separadas por espacos multiplos em vez de TAB
    // (ex.: "635     DESCRICAO          EMPRESA USADO   16.35")
    if (cols.length < 5) {
      const partes = linha.split(/\t+|\s{2,}/).map((s) => s.trim()).filter(Boolean)
      if (partes.length >= 2 && /^\d+$/.test(partes[0])) {
        const expandidas: string[] = []
        for (const parte of partes) {
          if (/^(EMPRESA|SISTEMA)\s+\S+$/i.test(parte)) expandidas.push(...parte.split(/\s+/))
          else expandidas.push(parte)
        }
        if (expandidas.length >= 4) cols = expandidas
      }
    }
    if (!/^\d+$/.test(cols[0])) {
      comentarioPendente = null
      continue
    }
    const id = Number(cols[0])
    const descricao = (cols[1] ?? '').trim()
    const comentarioLimpo = comentarioPendente
      ? comentarioPendente.replace(/\s*\[[^\]]*\]\s*$/g, '').replace(/\.$/, '').trim()
      : ''
    const comentario = comentarioLimpo && comentarioLimpo.toUpperCase() !== descricao.toUpperCase() ? comentarioLimpo : null
    const p: ParametroCatalogo = {
      id,
      descricao,
      tipo: (cols[2] ?? '').trim(),
      uso: (cols[3] ?? '').trim(),
      onde: (cols[4] ?? '').trim(),
      grupo: grupoAtual?.nome ?? 'Sem grupo',
      comentario,
    }
    parametros.push(p)
    grupoAtual?.ids.push(id)
    comentarioPendente = null
  }

  return { parametros, grupos, proximoIdLivre }
}
