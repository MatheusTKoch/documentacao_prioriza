/**
 * Acesso a disco do pipeline.
 *
 * Regra do projeto: as fontes (tags SVN, catalogo, CSV da AJUDA) sao SOMENTE LEITURA.
 * Toda escrita passa por `escrever`, que recusa qualquer caminho fora da raiz do repositorio.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const RAIZ_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const decUtf8Estrito = new TextDecoder('utf-8', { fatal: true })
const decCp1252 = new TextDecoder('windows-1252')

/** Le arquivo texto detectando UTF-8 (com ou sem BOM); caso contrario assume Windows-1252. */
export function lerTexto(caminho: string): string {
  const buf = fs.readFileSync(caminho)
  const semBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? buf.subarray(3) : buf
  try {
    return decUtf8Estrito.decode(semBom)
  } catch {
    return decCp1252.decode(semBom)
  }
}

export function existe(caminho: string): boolean {
  return fs.existsSync(caminho)
}

export function listarRecursivo(raiz: string, filtro: (p: string) => boolean, ignorarDir = /^(__history|__recovery|\.svn|node_modules)$/i): string[] {
  const saida: string[] = []
  const pilha = [raiz]
  while (pilha.length) {
    const dir = pilha.pop()!
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (!ignorarDir.test(ent.name)) pilha.push(p)
      } else if (filtro(p)) {
        saida.push(p)
      }
    }
  }
  return saida.sort()
}

function dentroDoRepo(caminho: string): boolean {
  const abs = path.resolve(caminho)
  const rel = path.relative(RAIZ_REPO, abs)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

/** Unica funcao de escrita do pipeline. Recusa caminhos fora da raiz do repositorio. */
export function escrever(caminho: string, conteudo: string): void {
  if (!dentroDoRepo(caminho)) {
    throw new Error(`Escrita recusada fora do repositorio: ${caminho}`)
  }
  fs.mkdirSync(path.dirname(caminho), { recursive: true })
  fs.writeFileSync(caminho, conteudo, 'utf8')
}

export function escreverJson(caminho: string, dados: unknown): void {
  escrever(caminho, JSON.stringify(dados, null, 2) + '\n')
}
