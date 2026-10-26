import path from 'node:path'
import { RAIZ_REPO, existe, lerTexto } from './fs.ts'

export interface VersaoFonte {
  nome: string
  raiz: string
}

export interface Config {
  versoes: VersaoFonte[]
  versaoPrincipal: string
  catalogo: string
  ajudaCsv: string
  formParametros: string
}

export function carregarConfig(): Config {
  const caminho = path.join(RAIZ_REPO, 'scripts', 'config.local.json')
  if (!existe(caminho)) {
    throw new Error(
      `Arquivo ${caminho} nao encontrado.\n` +
        'Copie scripts/config.example.json para scripts/config.local.json e ajuste os caminhos das fontes.',
    )
  }
  const cfg = JSON.parse(lerTexto(caminho)) as Config
  const faltando: string[] = []
  if (!existe(cfg.catalogo)) faltando.push(`catalogo: ${cfg.catalogo}`)
  if (!existe(cfg.ajudaCsv)) faltando.push(`ajudaCsv: ${cfg.ajudaCsv}`)
  for (const v of cfg.versoes ?? []) {
    if (!existe(v.raiz)) faltando.push(`versao ${v.nome}: ${v.raiz}`)
  }
  if (!cfg.versoes?.some((v) => v.nome === cfg.versaoPrincipal)) {
    faltando.push(`versaoPrincipal "${cfg.versaoPrincipal}" nao esta em versoes`)
  }
  if (faltando.length) {
    throw new Error('Fontes nao encontradas (nada foi gerado):\n  - ' + faltando.join('\n  - '))
  }
  return cfg
}
