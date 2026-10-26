/**
 * Arquivos `content/parametros/{id}.md`: explicacao em linguagem acessivel, escrita/revisada a mao.
 * O pipeline cria o arquivo apenas quando ele NAO existe (template) e nunca sobrescreve.
 */
import path from 'node:path'
import { RAIZ_REPO, escrever, existe, lerTexto } from './fs.ts'

export const DIR_CONTEUDO = path.join(RAIZ_REPO, 'content', 'parametros')

export interface Conteudo {
  revisado: boolean
  tituloAmigavel: string | null
  tags: string[]
  corpo: string
}

export function caminhoConteudo(id: number): string {
  return path.join(DIR_CONTEUDO, `${id}.md`)
}

export function templateConteudo(id: number, descricao: string): string {
  return [
    '---',
    `id: ${id}`,
    'revisado: false',
    'titulo_amigavel: ""',
    'tags: []',
    '---',
    '',
    `<!-- ${descricao} -->`,
    '',
    '',
  ].join('\n')
}

export function lerConteudo(id: number): Conteudo | null {
  const caminho = caminhoConteudo(id)
  if (!existe(caminho)) return null
  const texto = lerTexto(caminho)
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(texto)
  const front = m ? m[1] : ''
  const corpo = (m ? m[2] : texto).replace(/<!--[\s\S]*?-->/g, '').trim()
  const valor = (chave: string) => {
    const r = new RegExp(`^${chave}:\\s*(.*)$`, 'm').exec(front)
    return r ? r[1].trim() : ''
  }
  const titulo = valor('titulo_amigavel').replace(/^"(.*)"$/, '$1').trim()
  const tagsBrutas = valor('tags').replace(/^\[|\]$/g, '')
  return {
    revisado: /^true$/i.test(valor('revisado')),
    tituloAmigavel: titulo || null,
    tags: tagsBrutas
      .split(',')
      .map((t) => t.trim().replace(/^"|"$/g, ''))
      .filter(Boolean),
    corpo,
  }
}

/** Cria o template se nao existir. Retorna true quando criou. */
export function garantirConteudo(id: number, descricao: string): boolean {
  const caminho = caminhoConteudo(id)
  if (existe(caminho)) return false
  escrever(caminho, templateConteudo(id, descricao))
  return true
}
