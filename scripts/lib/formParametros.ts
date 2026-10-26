/**
 * Extrai de `uFrmParametros` (.dfm + .pas) o que a tela mostra para cada parametro:
 * aba, caption do rotulo, hint, opcoes de valor (Items dos combos) e botao de ajuda vinculado.
 *
 * Vinculo componente -> parametro_id:
 *   1. nome do componente contem `Parametro<ID>` (cbbParametro196, lblParametro607, ...)
 *   2. .pas: `comp.Text := TParametro.RetornaValorParametro*(ID, ...)`
 *   3. .pas: `TParametro.AlterarValorParametro*(ID, comp.Text)`
 * Vinculo botao de ajuda -> ajuda_id: handler `<btn>Click` que chama `CarregarAjuda(N)`.
 */
import { lerTexto } from './fs.ts'
import { caminhoAbas, parseDfm, percorrer, propNumero, propTexto, type NoDfm } from './dfm.ts'

export interface InfoTela {
  id: number
  aba: string[]
  caption: string | null
  hint: string | null
  opcoes: string[]
  componente: string | null
  ajudaId: number | null
  ajudaDistancia: number | null
  ajudaBotao: string | null
}

export interface ResultadoForm {
  porId: Map<number, InfoTela>
  botoesAjuda: { botao: string; ajudaId: number; aba: string[]; parametroId: number | null }[]
  abas: string[]
}

const RE_NOME_ID = /Parametro(\d+)/i
const TIPOS_ROTULO = /^(TLabel|TcxLabel|TStaticText)$/i
const TIPOS_AJUDA = /^(TSpeedButton|TBitBtn|TButton|TcxButton)$/i

function mapaComponenteId(pas: string): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const m of pas.matchAll(/(\w+)\.\w+\s*:=\s*[^;]*?RetornaValorParametro\w*\(\s*(\d+)/g)) {
    if (!mapa.has(m[1])) mapa.set(m[1], Number(m[2]))
  }
  for (const m of pas.matchAll(/AlterarValorParametro\w*\(\s*(\d+)\s*,\s*(\w+)\./g)) {
    if (!mapa.has(m[2])) mapa.set(m[2], Number(m[1]))
  }
  return mapa
}

function mapaHandlerAjuda(pas: string): Map<string, number> {
  const mapa = new Map<string, number>()
  // segmenta a implementation por cabecalho de metodo; o corpo vai ate o proximo cabecalho
  const re = /^(procedure|function)\s+T\w+\.(\w+)\s*\(/gm
  const cabecalhos = [...pas.matchAll(re)]
  for (let i = 0; i < cabecalhos.length; i++) {
    const ini = cabecalhos[i].index!
    const fim = i + 1 < cabecalhos.length ? cabecalhos[i + 1].index! : pas.length
    const aj = /CarregarAjuda\(\s*(\d+)\s*\)/.exec(pas.slice(ini, fim))
    if (aj) mapa.set(cabecalhos[i][2], Number(aj[1]))
  }
  return mapa
}

function paiContainer(no: NoDfm): NoDfm | null {
  return no.pai
}

export function extrairFormParametros(caminhoSemExtensao: string): ResultadoForm {
  const raiz = parseDfm(caminhoSemExtensao + '.dfm')
  const pas = lerTexto(caminhoSemExtensao + '.pas')
  const compId = mapaComponenteId(pas)
  const handlerAjuda = mapaHandlerAjuda(pas)

  const todos: NoDfm[] = []
  percorrer(raiz, (n) => {
    if (n.nome && n !== raiz) todos.push(n)
  })

  // botoes de ajuda -> ajuda_id
  const botoes: { no: NoDfm; ajudaId: number }[] = []
  for (const n of todos) {
    if (!TIPOS_AJUDA.test(n.tipo)) continue
    const onClick = propTexto(n, 'OnClick') ?? n.nome + 'Click'
    const ajudaId = handlerAjuda.get(onClick)
    if (ajudaId) botoes.push({ no: n, ajudaId })
  }

  // componentes -> parametro_id
  const controles = new Map<number, NoDfm[]>()
  const rotulosPorId = new Map<number, NoDfm[]>()
  for (const n of todos) {
    let id: number | null = null
    const porNome = RE_NOME_ID.exec(n.nome)
    if (porNome) id = Number(porNome[1])
    else if (compId.has(n.nome)) id = compId.get(n.nome)!
    if (id === null) continue
    const alvo = TIPOS_ROTULO.test(n.tipo) ? rotulosPorId : controles
    if (!alvo.has(id)) alvo.set(id, [])
    alvo.get(id)!.push(n)
  }

  const abas = new Set<string>()
  const porId = new Map<number, InfoTela>()
  const ids = new Set<number>([...controles.keys(), ...rotulosPorId.keys()])

  for (const id of ids) {
    const ctrls = controles.get(id) ?? []
    const rots = rotulosPorId.get(id) ?? []
    const principal = ctrls[0] ?? rots[0]
    const info: InfoTela = {
      id,
      aba: caminhoAbas(principal),
      caption: null,
      hint: null,
      opcoes: [],
      componente: ctrls[0]?.nome ?? null,
      ajudaId: null,
      ajudaDistancia: null,
      ajudaBotao: null,
    }
    if (info.aba.length) abas.add(info.aba.join(' / '))

    // rotulo: nomeado com o id, senao o mais proximo a esquerda na mesma linha
    let rotulo: NoDfm | null = rots[0] ?? null
    if (!rotulo && ctrls[0]) {
      rotulo = maisProximo(ctrls[0], (n) => TIPOS_ROTULO.test(n.tipo), 8, (cand, ref) => propNumero(cand, 'Left') < propNumero(ref, 'Left') + 2)
    }
    if (rotulo) {
      const cap = propTexto(rotulo, 'Caption')
      if (cap) info.caption = cap.replace(/^\[\d+\]\s*/, '').replace(/\s+/g, ' ').trim()
    }
    if (!info.caption && ctrls[0]) {
      const cap = propTexto(ctrls[0], 'Caption')
      if (cap) info.caption = cap.replace(/^\[\d+\]\s*/, '').trim()
    }

    for (const n of [...ctrls, ...rots, ...(rotulo ? [rotulo] : [])]) {
      const h = propTexto(n, 'Hint')
      if (h && !info.hint) info.hint = h.replace(/\s+/g, ' ').trim()
    }
    for (const n of ctrls) {
      const itens = n.props.get('Items.Strings') ?? n.props.get('Properties.Items.Strings')
      if (Array.isArray(itens) && itens.length) {
        info.opcoes = itens.map((s) => s.trim()).filter(Boolean)
        break
      }
    }

    // botao de ajuda na mesma linha
    const ref = ctrls[0] ?? rots[0]
    let melhor: { ajudaId: number; dist: number; nome: string } | null = null
    for (const b of botoes) {
      if (paiContainer(b.no) !== paiContainer(ref)) continue
      const dist = Math.abs(propNumero(b.no, 'Top') - propNumero(ref, 'Top'))
      if (dist <= 10 && (!melhor || dist < melhor.dist)) melhor = { ajudaId: b.ajudaId, dist, nome: b.no.nome }
    }
    if (melhor) {
      info.ajudaId = melhor.ajudaId
      info.ajudaDistancia = melhor.dist
      info.ajudaBotao = melhor.nome
    }
    porId.set(id, info)
  }

  // um botao de ajuda deve ficar com um unico parametro (o mais proximo)
  const donoPorBotao = new Map<string, InfoTela>()
  for (const info of porId.values()) {
    if (!info.ajudaBotao) continue
    const atual = donoPorBotao.get(info.ajudaBotao)
    if (!atual || (info.ajudaDistancia ?? 99) < (atual.ajudaDistancia ?? 99)) {
      if (atual) {
        atual.ajudaId = null
        atual.ajudaBotao = null
        atual.ajudaDistancia = null
      }
      donoPorBotao.set(info.ajudaBotao, info)
    } else {
      info.ajudaId = null
      info.ajudaBotao = null
      info.ajudaDistancia = null
    }
  }

  const botoesAjuda = botoes.map((b) => ({
    botao: b.no.nome,
    ajudaId: b.ajudaId,
    aba: caminhoAbas(b.no),
    parametroId: donoPorBotao.get(b.no.nome)?.id ?? null,
  }))

  return { porId, botoesAjuda, abas: [...abas].sort() }
}

function maisProximo(
  ref: NoDfm,
  filtro: (n: NoDfm) => boolean,
  tolTop: number,
  extra: (cand: NoDfm, ref: NoDfm) => boolean,
): NoDfm | null {
  const pai = ref.pai
  if (!pai) return null
  let melhor: NoDfm | null = null
  let melhorDist = Infinity
  const topRef = propNumero(ref, 'Top')
  const leftRef = propNumero(ref, 'Left')
  for (const c of pai.filhos) {
    if (c === ref || !filtro(c) || !extra(c, ref)) continue
    const dTop = Math.abs(propNumero(c, 'Top') - topRef)
    if (dTop > tolTop) continue
    const dist = dTop * 10 + Math.abs(leftRef - propNumero(c, 'Left'))
    if (dist < melhorDist) {
      melhorDist = dist
      melhor = c
    }
  }
  return melhor
}
