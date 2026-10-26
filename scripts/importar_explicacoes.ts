/**
 * Importa explicacoes em lote para content/parametros/{id}.md.
 *
 *   node scripts/importar_explicacoes.ts caminho/lote.json [--sobrescrever]
 *
 * Formato do lote: { "196": { "t": "Titulo amigavel", "x": "Texto em markdown" }, "250": "So o texto" }
 * Por padrao so preenche arquivos cujo corpo esta vazio; nunca cria arquivo para id fora do catalogo.
 */
import fs from 'node:fs'
import { caminhoConteudo } from './lib/conteudo.ts'
import { escrever, existe, lerTexto } from './lib/fs.ts'

const [arquivo, ...flags] = process.argv.slice(2)
if (!arquivo) {
  console.error('uso: node scripts/importar_explicacoes.ts lote.json [--sobrescrever]')
  process.exit(1)
}
const sobrescrever = flags.includes('--sobrescrever')
const lote = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as Record<string, string | { t?: string; x: string }>

let gravados = 0
let pulados = 0
let inexistentes = 0
for (const [idTexto, valor] of Object.entries(lote)) {
  const id = Number(idTexto)
  const caminho = caminhoConteudo(id)
  if (!existe(caminho)) {
    inexistentes++
    console.log(`  id ${id}: sem arquivo em content/parametros (rode npm run extrair primeiro?)`)
    continue
  }
  const atual = lerTexto(caminho)
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(atual)
  if (!m) {
    console.log(`  id ${id}: frontmatter nao reconhecido; ignorado`)
    continue
  }
  const comentario = (/<!--[\s\S]*?-->/.exec(m[2]) ?? [''])[0]
  const corpoAtual = m[2].replace(/<!--[\s\S]*?-->/g, '').trim()
  if (corpoAtual && !sobrescrever) {
    pulados++
    continue
  }
  let front = m[1]
  const titulo = typeof valor === 'object' ? valor.t : undefined
  const texto = (typeof valor === 'object' ? valor.x : valor).trim()
  if (titulo) front = front.replace(/^titulo_amigavel:.*$/m, `titulo_amigavel: ${JSON.stringify(titulo)}`)
  escrever(caminho, `---\n${front}\n---\n\n${comentario}\n\n${texto}\n`)
  gravados++
}
console.log(`[importar] gravados ${gravados}, ja tinham texto ${pulados}, sem arquivo ${inexistentes}`)
