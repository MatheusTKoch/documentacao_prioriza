export interface Uso {
  unit: string
  pasta: string
  tela: string | null
  tipo: 'form' | 'classe' | 'datamodule' | 'outro'
  versoes: string[]
  leituras: number
  gravacoes: number
}

export interface Ajuda {
  id: number
  titulo: string
  resumo: string
  detalhamento: string
}

export interface Parametro {
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
  ajuda: Ajuda | null
  usos: Uso[]
  versoes: string[]
  explicacao: string
  revisado: boolean
  tituloAmigavel: string | null
  tags: string[]
}

export interface Tela {
  slug: string
  nome: string
  descricao: string | null
  ids: number[]
  total: number
}

export interface Meta {
  geradoEm: string
  versoes: string[]
  versaoPrincipal: string
  totais: Record<string, number>
  proximoIdLivre: number | null
  idsForaDoCatalogo: number[]
  idsSemUsoNemTela: number[]
  idsSemExplicacao: number[]
  ajudasSemParametro: { ajudaId: number; titulo: string }[]
  botoesAjudaSemParametro: { botao: string; ajudaId: number; aba: string }[]
  ajudaSemRegistroNoCsv: number[]
}
