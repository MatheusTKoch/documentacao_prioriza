/**
 * Parser minimo de arquivos .dfm (texto) do Delphi.
 *
 * Cobre o necessario para esta documentacao: arvore de componentes, propriedades
 * simples, strings com escapes `#NNN`, strings multilinha, listas `Items.Strings = (...)`,
 * colecoes `<item ... end>` e blobs binarios `{ ... }` (ignorados).
 */
import { lerTexto } from './fs.ts'

export interface NoDfm {
  nome: string
  tipo: string
  props: Map<string, string | string[]>
  filhos: NoDfm[]
  pai: NoDfm | null
}

const RE_ABRE = /^(object|inherited|inline)\s+(\w+)\s*:\s*(\w+)/i

/** Converte `'Opera'#231#227'o'` em `Operação`. */
export function decodificarStringDfm(bruta: string): string {
  let saida = ''
  let i = 0
  const s = bruta.trim()
  while (i < s.length) {
    const c = s[i]
    if (c === "'") {
      i++
      while (i < s.length) {
        if (s[i] === "'") {
          if (s[i + 1] === "'") {
            saida += "'"
            i += 2
            continue
          }
          i++
          break
        }
        saida += s[i++]
      }
    } else if (c === '#') {
      let j = i + 1
      while (j < s.length && /\d/.test(s[j])) j++
      saida += String.fromCodePoint(Number(s.slice(i + 1, j)))
      i = j
    } else {
      i++ // espacos e '+'
    }
  }
  return saida
}

export function parseDfm(caminho: string): NoDfm {
  const linhas = lerTexto(caminho).split(/\r?\n/)
  const raiz: NoDfm = { nome: '', tipo: '', props: new Map(), filhos: [], pai: null }
  let atual = raiz
  let i = 0

  const abrirNo = (nome: string, tipo: string) => {
    const no: NoDfm = { nome, tipo, props: new Map(), filhos: [], pai: atual }
    atual.filhos.push(no)
    atual = no
  }

  while (i < linhas.length) {
    const linha = linhas[i].trim()
    i++
    if (!linha) continue

    const abre = RE_ABRE.exec(linha)
    if (abre) {
      abrirNo(abre[2], abre[3])
      continue
    }
    if (linha === 'item') {
      abrirNo('item', 'item')
      continue
    }
    if (linha === 'end' || linha === 'end>') {
      if (atual.pai) atual = atual.pai
      continue
    }

    const eq = linha.indexOf(' = ')
    if (eq < 0) continue
    const chave = linha.slice(0, eq).trim()
    let valor = linha.slice(eq + 3).trim()

    if (valor === '<' || valor === '<>') continue // colecao: itens viram nos
    if (valor.startsWith('{') && !valor.endsWith('}')) {
      while (i < linhas.length && !linhas[i].trim().endsWith('}')) i++
      i++
      continue
    }
    if (valor.startsWith('(')) {
      const itens: string[] = []
      let corpo = valor.slice(1)
      let fechou = false
      // pode fechar na mesma linha: Items.Strings = ('A')
      for (;;) {
        const t = corpo.trim()
        if (t.endsWith(')')) {
          corpo = t.slice(0, -1)
          fechou = true
        }
        if (corpo.trim()) itens.push(decodificarStringDfm(corpo))
        if (fechou || i >= linhas.length) break
        corpo = linhas[i++]
      }
      atual.props.set(chave, itens)
      continue
    }
    if (valor === '' || valor.endsWith('+')) {
      let acumulado = valor.endsWith('+') ? valor.slice(0, -1) : ''
      while (i < linhas.length) {
        const cont = linhas[i].trim()
        i++
        if (cont.endsWith('+')) {
          acumulado += cont.slice(0, -1)
        } else {
          acumulado += cont
          break
        }
      }
      valor = acumulado
    }
    if (valor.startsWith("'") || valor.startsWith('#')) {
      atual.props.set(chave, decodificarStringDfm(valor))
    } else {
      atual.props.set(chave, valor)
    }
  }
  return raiz.filhos[0] ?? raiz
}

export function propTexto(no: NoDfm, chave: string): string | null {
  const v = no.props.get(chave)
  return typeof v === 'string' ? v : null
}

export function propNumero(no: NoDfm, chave: string): number {
  const v = no.props.get(chave)
  return typeof v === 'string' && /^-?\d+$/.test(v) ? Number(v) : 0
}

export function percorrer(no: NoDfm, fn: (n: NoDfm) => void): void {
  fn(no)
  for (const f of no.filhos) percorrer(f, fn)
}

/** Captions das abas (TabSheet) acima do componente, da mais externa para a mais interna. */
export function caminhoAbas(no: NoDfm): string[] {
  const abas: string[] = []
  for (let p = no.pai; p; p = p.pai) {
    if (/TabSheet$/i.test(p.tipo)) {
      const c = propTexto(p, 'Caption')
      if (c) abas.unshift(c.replace(/&/g, '').trim())
    }
  }
  return abas
}
