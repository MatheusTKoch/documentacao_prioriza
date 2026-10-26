/**
 * Leitor do export CSV da tabela AJUDA (ajuda_id, titulo_janela, resumo, detalhamento, uuid_publico).
 *
 * Parte dos registros foi gravada no banco com UTF-8 interpretado como Windows-1252
 * ("ORÃ‡AMENTO", "PADRÃƒO"). O reparo e feito por campo: re-codifica em CP1252 e decodifica
 * como UTF-8 estrito; se nao for UTF-8 valido, o texto original e mantido. O CSV nao e alterado.
 */
import { lerTexto } from './fs.ts'

export interface Ajuda {
  ajudaId: number
  titulo: string
  resumo: string
  detalhamento: string
  reparado: boolean
}

const decCp1252 = new TextDecoder('windows-1252')
const decUtf8 = new TextDecoder('utf-8', { fatal: true })
const paraCp1252 = new Map<string, number>()
for (let b = 0; b < 256; b++) paraCp1252.set(decCp1252.decode(new Uint8Array([b])), b)

/** Verdadeiro se existe "Ã"/"Â" seguido de um caractere cujo byte CP1252 e de continuacao UTF-8 (0x80-0xBF). */
function pareceMojibake(texto: string): boolean {
  for (let i = 0; i + 1 < texto.length; i++) {
    if (texto[i] !== '\u00C3' && texto[i] !== '\u00C2') continue
    const b = paraCp1252.get(texto[i + 1])
    if (b !== undefined && b >= 0x80 && b <= 0xbf) return true
  }
  return false
}

export function repararMojibake(texto: string): { texto: string; reparado: boolean } {
  if (!pareceMojibake(texto)) return { texto, reparado: false }
  const bytes = new Uint8Array(texto.length)
  for (let i = 0; i < texto.length; i++) {
    const b = paraCp1252.get(texto[i])
    if (b === undefined) return { texto, reparado: false }
    bytes[i] = b
  }
  try {
    return { texto: decUtf8.decode(bytes), reparado: true }
  } catch {
    return { texto, reparado: false }
  }
}

const SIGLAS = new Set(
  'PDV NFE NFCE NFC-E NFS-E NFSE CTE CT-E MDFE MDF-E SEFAZ ERP XML PIX ICMS PIS COFINS IPI ISS NCM CEST CST CSOSN CFOP DFE API SAT TEF CPF CNPJ IE SIM NÃO ID BD FTP S3 URL PDF TXT CSV SMS GEN KRAFTI PRIORIZA UMOV.ME POS SPED EAN GTIN FCP ST DANFE DACTE IBPT IBS CBS BI OS'.split(' '),
)

/** Textos da AJUDA estao em CAIXA ALTA; converte para frases normais preservando siglas. */
export function suavizarCaixaAlta(texto: string): string {
  const letras = texto.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (!letras || letras.replace(/[^A-ZÀ-Þ]/g, '').length / letras.length < 0.8) return texto
  const baixo = texto.toLowerCase()
  let saida = baixo.replace(/(^|[.!?:]\s+|\n\s*)([a-zà-ÿ])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
  saida = saida.replace(/[a-zà-ÿ0-9.\-]+/gi, (palavra) => {
    const limpa = palavra.replace(/[.,;:]+$/, '')
    const sufixo = palavra.slice(limpa.length)
    return SIGLAS.has(limpa.toUpperCase()) ? limpa.toUpperCase() + sufixo : palavra
  })
  return saida
}

export function parseCsv(texto: string): string[][] {
  const linhas: string[][] = []
  let campo = ''
  let atual: string[] = []
  let aspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'
          i++
        } else {
          aspas = false
        }
      } else {
        campo += c
      }
    } else if (c === '"') {
      aspas = true
    } else if (c === ',') {
      atual.push(campo)
      campo = ''
    } else if (c === '\n') {
      atual.push(campo)
      linhas.push(atual)
      atual = []
      campo = ''
    } else if (c !== '\r') {
      campo += c
    }
  }
  if (campo !== '' || atual.length) {
    atual.push(campo)
    linhas.push(atual)
  }
  return linhas
}

export function lerAjudaCsv(caminho: string): Map<number, Ajuda> {
  const linhas = parseCsv(lerTexto(caminho))
  const cab = linhas[0].map((c) => c.trim().toLowerCase())
  const col = (nome: string) => {
    const i = cab.indexOf(nome)
    if (i < 0) throw new Error(`CSV da AJUDA sem a coluna "${nome}" (colunas: ${cab.join(', ')})`)
    return i
  }
  const iId = col('ajuda_id')
  const iTitulo = col('titulo_janela')
  const iResumo = col('resumo')
  const iDet = col('detalhamento')

  const mapa = new Map<number, Ajuda>()
  for (const l of linhas.slice(1)) {
    if (!l[iId] || !/^\d+$/.test(l[iId].trim())) continue
    const t = repararMojibake(l[iTitulo] ?? '')
    const r = repararMojibake(l[iResumo] ?? '')
    const d = repararMojibake(l[iDet] ?? '')
    mapa.set(Number(l[iId]), {
      ajudaId: Number(l[iId]),
      titulo: t.texto.replace(/\s+/g, ' ').trim(),
      resumo: suavizarCaixaAlta(r.texto.replace(/\s+/g, ' ').trim()),
      detalhamento: suavizarCaixaAlta(d.texto.replace(/[ \t]+/g, ' ').trim()),
      reparado: t.reparado || r.reparado || d.reparado,
    })
  }
  return mapa
}
