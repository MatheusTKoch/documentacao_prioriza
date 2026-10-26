/**
 * Lista parametros (uma linha por id) para revisao rapida no terminal.
 *
 *   node scripts/listar.ts [prefixo-do-grupo ...] [--sem-explicacao]
 *
 * Ex.: node scripts/listar.ts PDV "Venda - Nota" --sem-explicacao
 */
import path from 'node:path'
import { RAIZ_REPO, lerTexto } from './lib/fs.ts'

interface Uso {
  tipo: string
  tela: string | null
  unit: string
}
interface Parametro {
  id: number
  descricao: string
  grupo: string
  caption: string | null
  hint: string | null
  comentario: string | null
  opcoes: string[]
  uso: string
  ajuda: { resumo: string } | null
  usos: Uso[]
  explicacao: string
}

const args = process.argv.slice(2)
const soSemExplicacao = args.includes('--sem-explicacao')
const grupos = args.filter((a) => !a.startsWith('--')).map((a) => a.toLowerCase())
const parametros = JSON.parse(lerTexto(path.join(RAIZ_REPO, 'src', 'data', 'parametros.json'))) as Parametro[]

for (const p of parametros) {
  if (grupos.length && !grupos.some((g) => p.grupo.toLowerCase().startsWith(g))) continue
  if (soSemExplicacao && p.explicacao) continue
  const telas = [...new Set(p.usos.filter((u) => u.tipo === 'form').map((u) => u.tela ?? u.unit))].slice(0, 4).join('; ')
  const extra = [
    p.caption && p.caption !== p.descricao ? `cap:${p.caption}` : '',
    p.hint ? `hint:${p.hint}` : '',
    p.ajuda ? `ajuda:${p.ajuda.resumo.slice(0, 160)}` : '',
    p.comentario ? `com:${p.comentario}` : '',
    p.opcoes.length ? `op:${p.opcoes.join('/')}` : '',
    telas ? `telas:${telas}` : '',
    p.uso !== 'USADO' ? p.uso : '',
  ]
    .filter(Boolean)
    .join(' | ')
  console.log(`${p.id}\t${p.descricao}\t${extra}`)
}
