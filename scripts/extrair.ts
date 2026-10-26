/**
 * Pipeline de extracao da documentacao de parametros do Prioriza ERP.
 *
 *   node scripts/extrair.ts
 *
 * Le (somente leitura): catalogo PARAMETROS.parametro, uFrmParametros (.dfm/.pas) e todos os .pas
 * das versoes configuradas, e o CSV exportado da tabela AJUDA.
 * Escreve (somente dentro deste repositorio): src/data/*.json, content/parametros/{id}.md (apenas
 * novos) e scripts/ajuda_map.json (apenas entradas novas).
 */
import path from 'node:path'
import { carregarConfig } from './lib/config.ts'
import { RAIZ_REPO, escreverJson, existe, lerTexto } from './lib/fs.ts'
import { lerCatalogo } from './lib/catalogo.ts'
import { extrairFormParametros, type InfoTela, type ResultadoForm } from './lib/formParametros.ts'
import { varrerUsos, type UsoUnit } from './lib/usos.ts'
import { lerAjudaCsv } from './lib/ajuda.ts'
import { garantirConteudo, lerConteudo } from './lib/conteudo.ts'

interface EntradaMapaAjuda {
  parametroId: number | null
  titulo: string
  origem: 'auto' | 'manual'
  botao: string | null
  aba: string | null
  observacao?: string
}

interface UsoSaida {
  unit: string
  pasta: string
  tela: string | null
  tipo: UsoUnit['tipo']
  versoes: string[]
  leituras: number
  gravacoes: number
}

interface ParametroSaida {
  id: number
  descricao: string
  tipo: string
  uso: string
  onde: string
  grupo: string
  grupoSlug: string
  comentario: string | null
  aba: string[]
  caption: string | null
  hint: string | null
  opcoes: string[]
  componente: string | null
  ajuda: { id: number; titulo: string; resumo: string; detalhamento: string } | null
  usos: UsoSaida[]
  versoes: string[]
  explicacao: string
  revisado: boolean
  tituloAmigavel: string | null
  tags: string[]
}

export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function principal() {
  if (process.env.CI) {
    console.log('[extrair] CI detectado: nada a fazer (o JSON commitado e usado como esta).')
    return
  }
  const inicio = Date.now()
  const cfg = carregarConfig()
  const log = (m: string) => console.log(`[extrair] ${m}`)

  // 1. catalogo (+ nomes de exibicao com acento para os grupos)
  const catalogo = lerCatalogo(cfg.catalogo)
  log(`catalogo: ${catalogo.parametros.length} parametros em ${catalogo.grupos.length} grupos`)
  const caminhoNomes = path.join(RAIZ_REPO, 'scripts', 'telas_nomes.json')
  const nomesTelas: Record<string, string> = existe(caminhoNomes) ? JSON.parse(lerTexto(caminhoNomes)) : {}
  const nomeTela = (grupo: string) => nomesTelas[grupo] ?? grupo
  const gruposSemNome = catalogo.grupos.filter((g) => !nomesTelas[g.nome]).map((g) => g.nome)
  if (gruposSemNome.length) log(`AVISO: grupos sem nome de exibicao em scripts/telas_nomes.json: ${gruposSemNome.join(' | ')}`)

  // 2. tela de parametros por versao (principal primeiro, demais como fallback)
  const versoesOrdenadas = [...cfg.versoes].sort((a, b) => (a.nome === cfg.versaoPrincipal ? -1 : b.nome === cfg.versaoPrincipal ? 1 : 0))
  const formPorVersao = new Map<string, ResultadoForm>()
  for (const v of versoesOrdenadas) {
    const base = path.join(v.raiz, cfg.formParametros)
    if (!existe(base + '.dfm') || !existe(base + '.pas')) {
      log(`AVISO: ${base}.dfm/.pas nao encontrado na versao ${v.nome}`)
      continue
    }
    const r = extrairFormParametros(base)
    formPorVersao.set(v.nome, r)
    log(`tela ${v.nome}: ${r.porId.size} parametros com componente, ${r.botoesAjuda.length} botoes de ajuda`)
  }
  const infoTela = (id: number): { info: InfoTela; versao: string } | null => {
    for (const v of versoesOrdenadas) {
      const i = formPorVersao.get(v.nome)?.porId.get(id)
      if (i) return { info: i, versao: v.nome }
    }
    return null
  }

  // 3. usos no codigo por versao
  const unitForm = path.basename(cfg.formParametros)
  const usosPorVersao = new Map<string, ReturnType<typeof varrerUsos>>()
  for (const v of cfg.versoes) {
    const r = varrerUsos(v.raiz, unitForm)
    usosPorVersao.set(v.nome, r)
    log(`usos ${v.nome}: ${r.usos.size} parametros referenciados em ${r.units.size} units`)
  }

  // 4. ajuda (CSV) + mapa curado
  const ajudas = lerAjudaCsv(cfg.ajudaCsv)
  log(`ajuda: ${ajudas.size} registros (${[...ajudas.values()].filter((a) => a.reparado).length} com encoding reparado)`)
  const caminhoMapa = path.join(RAIZ_REPO, 'scripts', 'ajuda_map.json')
  const mapa: Record<string, EntradaMapaAjuda> = existe(caminhoMapa) ? JSON.parse(lerTexto(caminhoMapa)) : {}
  let novasEntradas = 0
  const formPrincipal = formPorVersao.get(cfg.versaoPrincipal)
  for (const b of formPrincipal?.botoesAjuda ?? []) {
    const chave = String(b.ajudaId)
    if (mapa[chave]) continue
    mapa[chave] = {
      parametroId: b.parametroId,
      titulo: ajudas.get(b.ajudaId)?.titulo ?? '',
      origem: 'auto',
      botao: b.botao,
      aba: b.aba.join(' / ') || null,
    }
    novasEntradas++
  }
  for (const a of ajudas.values()) {
    const chave = String(a.ajudaId)
    if (mapa[chave]) continue
    mapa[chave] = { parametroId: null, titulo: a.titulo, origem: 'auto', botao: null, aba: null }
    novasEntradas++
  }
  const mapaOrdenado = Object.fromEntries(Object.entries(mapa).sort((a, b) => Number(a[0]) - Number(b[0])))
  if (novasEntradas || !existe(caminhoMapa)) {
    escreverJson(caminhoMapa, mapaOrdenado)
    log(`ajuda_map.json: ${novasEntradas} entradas novas (entradas existentes preservadas)`)
  }
  const ajudaPorParametro = new Map<number, number>()
  for (const [k, e] of Object.entries(mapaOrdenado)) {
    if (e.parametroId !== null && !ajudaPorParametro.has(e.parametroId)) ajudaPorParametro.set(e.parametroId, Number(k))
  }

  // 5. monta saida
  const idsCatalogo = new Set(catalogo.parametros.map((p) => p.id))
  const saida: ParametroSaida[] = []
  let conteudosCriados = 0
  const semConteudo: number[] = []

  for (const p of catalogo.parametros) {
    const t = infoTela(p.id)
    const usosMap = new Map<string, UsoSaida>()
    const versoes = new Set<string>()
    for (const v of cfg.versoes) {
      const porUnit = usosPorVersao.get(v.nome)?.usos.get(p.id)
      if (!porUnit) continue
      versoes.add(v.nome)
      for (const [unit, u] of porUnit) {
        const atual = usosMap.get(unit)
        if (atual) {
          atual.versoes.push(v.nome)
          atual.leituras = Math.max(atual.leituras, u.leituras)
          atual.gravacoes = Math.max(atual.gravacoes, u.gravacoes)
          if (!atual.tela && u.tela) atual.tela = u.tela
        } else {
          usosMap.set(unit, { unit, pasta: u.pasta, tela: u.tela, tipo: u.tipo, versoes: [v.nome], leituras: u.leituras, gravacoes: u.gravacoes })
        }
      }
    }
    for (const v of cfg.versoes) if (formPorVersao.get(v.nome)?.porId.has(p.id)) versoes.add(v.nome)

    if (garantirConteudo(p.id, p.descricao)) conteudosCriados++
    const c = lerConteudo(p.id)
    if (!c || !c.corpo) semConteudo.push(p.id)

    // vinculo ajuda -> parametro vem exclusivamente do mapa curado (scripts/ajuda_map.json)
    const ajudaId = ajudaPorParametro.get(p.id) ?? null
    const aj = ajudaId ? ajudas.get(ajudaId) : undefined

    saida.push({
      id: p.id,
      descricao: p.descricao,
      tipo: p.tipo,
      uso: p.uso,
      onde: p.onde,
      grupo: nomeTela(p.grupo),
      grupoSlug: slug(p.grupo),
      comentario: p.comentario,
      aba: t?.info.aba ?? [],
      caption: t?.info.caption ?? null,
      hint: t?.info.hint ?? null,
      opcoes: t?.info.opcoes ?? [],
      componente: t?.info.componente ?? null,
      ajuda: aj ? { id: aj.ajudaId, titulo: aj.titulo, resumo: aj.resumo, detalhamento: aj.detalhamento } : null,
      usos: [...usosMap.values()].sort((a, b) => (a.tipo === b.tipo ? a.unit.localeCompare(b.unit) : a.tipo === 'form' ? -1 : b.tipo === 'form' ? 1 : a.tipo.localeCompare(b.tipo))),
      versoes: cfg.versoes.map((v) => v.nome).filter((n) => versoes.has(n)),
      explicacao: c?.corpo ?? '',
      revisado: c?.revisado ?? false,
      tituloAmigavel: c?.tituloAmigavel ?? null,
      tags: c?.tags ?? [],
    })
  }

  const telas = catalogo.grupos.map((g) => ({
    slug: slug(g.nome),
    nome: nomeTela(g.nome),
    nomeCatalogo: g.nome,
    descricao: g.descricao,
    ids: g.ids,
    total: g.ids.length,
  }))

  // 6. diagnostico
  const idsNoCodigo = new Set<number>()
  for (const r of usosPorVersao.values()) for (const id of r.usos.keys()) idsNoCodigo.add(id)
  for (const r of formPorVersao.values()) for (const id of r.porId.keys()) idsNoCodigo.add(id)
  const foraDoCatalogo = [...idsNoCodigo].filter((id) => !idsCatalogo.has(id)).sort((a, b) => a - b)
  const semUso = saida.filter((p) => p.usos.length === 0 && p.aba.length === 0 && p.uso !== 'LEGADO').map((p) => p.id)
  const ajudasSemParametro = Object.entries(mapaOrdenado).filter(([, e]) => e.parametroId === null).map(([k, e]) => ({ ajudaId: Number(k), titulo: e.titulo }))
  const botoesSemParametro = (formPrincipal?.botoesAjuda ?? []).filter((b) => b.parametroId === null).map((b) => ({ botao: b.botao, ajudaId: b.ajudaId, aba: b.aba.join(' / ') }))
  const ajudaSemCsv = (formPrincipal?.botoesAjuda ?? []).filter((b) => !ajudas.has(b.ajudaId)).map((b) => b.ajudaId)

  const diagnostico = {
    geradoEm: new Date().toISOString(),
    versoes: cfg.versoes.map((v) => v.nome),
    versaoPrincipal: cfg.versaoPrincipal,
    totais: {
      parametros: saida.length,
      comTela: saida.filter((p) => p.aba.length).length,
      comAjuda: saida.filter((p) => p.ajuda).length,
      comHint: saida.filter((p) => p.hint).length,
      comUsos: saida.filter((p) => p.usos.length).length,
      explicados: saida.filter((p) => p.explicacao).length,
      revisados: saida.filter((p) => p.revisado).length,
    },
    proximoIdLivre: catalogo.proximoIdLivre,
    idsForaDoCatalogo: foraDoCatalogo,
    idsSemUsoNemTela: semUso,
    idsSemExplicacao: semConteudo,
    ajudasSemParametro,
    botoesAjudaSemParametro: botoesSemParametro,
    ajudaSemRegistroNoCsv: [...new Set(ajudaSemCsv)],
  }

  const dirDados = path.join(RAIZ_REPO, 'src', 'data')
  escreverJson(path.join(dirDados, 'parametros.json'), saida)
  escreverJson(path.join(dirDados, 'telas.json'), telas)
  escreverJson(path.join(dirDados, 'meta.json'), diagnostico)

  log(`content/parametros: ${conteudosCriados} templates criados; ${semConteudo.length} sem explicacao`)
  log(`diagnostico: ${foraDoCatalogo.length} ids no codigo fora do catalogo ${foraDoCatalogo.length ? JSON.stringify(foraDoCatalogo) : ''}`)
  log(`diagnostico: ${semUso.length} ids sem uso no codigo e sem tela (nao-legado)`)
  log(`diagnostico: ${ajudasSemParametro.length} ajudas sem parametro vinculado; ${botoesSemParametro.length} botoes de ajuda sem parametro`)
  if (ajudaSemCsv.length) log(`diagnostico: botoes apontam para ajuda_id ausente no CSV: ${[...new Set(ajudaSemCsv)].join(', ')}`)
  log(`ok em ${((Date.now() - inicio) / 1000).toFixed(1)}s -> src/data/{parametros,telas,meta}.json`)
}

principal()
