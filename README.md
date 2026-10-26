# Documentação de parâmetros — Prioriza ERP

Painel estático (Vue 3 + Vite) que documenta os parâmetros do Prioriza ERP: o que cada um faz, valores possíveis, onde é configurado e em quais telas é usado. Publicado no GitHub Pages.

- Site: `https://<usuario>.github.io/documentacao_prioriza/`
- Conteúdo gerado a partir do código-fonte (tags SVN) e do catálogo oficial — **nunca** inclui valores configurados de clientes.

## Como funciona

```
fontes locais (SOMENTE LEITURA)                 este repositório
──────────────────────────────                  ─────────────────────────────────────
dados/scripts/PARAMETROS.parametro  ─┐          scripts/extrair.ts
tags/20.25.16.35/Fontes/**/*.pas    ─┤   ──►    ├─ src/data/parametros.json  (gerado)
tags/20.26.24.00/Fontes/**/*.pas    ─┤          ├─ src/data/telas.json       (gerado)
Outros/uFrmParametros.{dfm,pas}     ─┤          ├─ src/data/meta.json        (gerado)
export CSV da tabela AJUDA          ─┘          ├─ content/parametros/{id}.md (criado 1x, editado à mão)
                                                └─ scripts/ajuda_map.json     (curado à mão)
```

| Fonte | O que fornece |
|---|---|
| `PARAMETROS.parametro` | lista oficial de IDs, descrição, tipo (EMPRESA/SISTEMA), uso (USADO/LEGADO/TELA), versão e grupo (aba) |
| `uFrmParametros.dfm/.pas` | aba onde aparece, rótulo, hint, opções do combo, botão de ajuda |
| `*.pas` das duas versões | telas/classes que leem ou gravam cada parâmetro (`RetornaValorParametro*`, `AlterarValorParametro*`) |
| CSV da tabela `AJUDA` | resumo e detalhamento dos botões "?" (encoding corrompido é reparado na leitura) |
| `content/parametros/{id}.md` | explicação em linguagem acessível, escrita e revisada pela equipe |

### Garantias

- O script **só lê** as fontes. Toda escrita passa por uma única função que recusa qualquer caminho fora deste repositório (`scripts/lib/fs.ts`).
- Nenhum comando SVN é executado. Atualizar as tags (`svn update`) é ação manual sua, fora do fluxo.
- O GitHub Actions **não** regenera dados (não enxerga as fontes locais): ele só compila o JSON já commitado.

## Configuração inicial

```bash
npm install                      # também ativa o hook pre-commit (core.hooksPath = .githooks)
cp scripts/config.example.json scripts/config.local.json   # ajuste os caminhos locais
npm run extrair                  # gera src/data/*.json
npm run dev                      # http://localhost:5173/documentacao_prioriza/
```

`scripts/config.local.json` fica fora do git. Campos:

| Campo | Significado |
|---|---|
| `versoes[]` | nome exibido + pasta `Fontes` de cada tag analisada |
| `versaoPrincipal` | versão cuja tela de Parâmetros prevalece (as outras servem de fallback) |
| `catalogo` | caminho do `PARAMETROS.parametro` |
| `ajudaCsv` | caminho do export CSV da tabela `AJUDA` |
| `formParametros` | caminho relativo (sem extensão) da unit da tela de Parâmetros |

## Fluxo de atualização

1. (Manual, opcional) `svn update` nas tags; se a tabela `AJUDA` mudou, reexporte o CSV e aponte o novo caminho em `config.local.json`.
   Export sugerido (DBeaver ou psql): `\copy (select ajuda_id, titulo_janela, resumo, detalhamento, uuid_publico from ajuda order by 1) to 'ajuda.csv' csv header`
2. `git commit` → o hook `.githooks/pre-commit` roda `npm run extrair`, regenera `src/data/*.json`, cria `content/parametros/{id}.md` **apenas para IDs novos** e adiciona tudo ao commit.
   - Para rodar sem o hook: `npm run extrair` (também roda automaticamente no `npm run build`).
   - Para commitar sem regenerar: `PULAR_EXTRACAO=1 git commit ...`
3. Revise o `git diff`, ajuste explicações, `git push` → o Actions compila e publica no Pages.

O console do script mostra um diagnóstico: IDs usados no código mas ausentes do catálogo, IDs sem uso, ajudas sem parâmetro vinculado etc. O mesmo resumo aparece no site em `#/status`.

## Escrevendo explicações

Cada parâmetro tem um arquivo `content/parametros/{id}.md`:

```markdown
---
id: 196
revisado: false
titulo_amigavel: "Controlar estoque por centro de armazenagem"
tags: [estoque]
---

Quando ligado, o sistema passa a separar o estoque por local físico ...
```

- `revisado: true` remove o aviso de rascunho no site.
- `titulo_amigavel` substitui o nome técnico nas listas e no título da página.
- O corpo aceita Markdown. O script **nunca** sobrescreve um arquivo existente.

Os 633 arquivos atuais foram preenchidos com rascunhos gerados a partir do caption, hint, texto de ajuda e uso no código. Todos estão com `revisado: false` até serem conferidos.

### Ferramentas de apoio

```bash
# lista parâmetros de um ou mais grupos com caption/hint/ajuda/telas (útil para revisar em lote)
node scripts/listar.ts PDV "Venda - Nota"
node scripts/listar.ts --sem-explicacao          # só os que ainda estão sem texto

# importa explicações em lote a partir de um JSON { "196": { "t": "Título", "x": "markdown" }, "250": "texto" }
node scripts/importar_explicacoes.ts caminho/lote.json
node scripts/importar_explicacoes.ts caminho/lote.json --sobrescrever   # substitui textos existentes
```

`importar_explicacoes.ts` só preenche arquivos com corpo vazio (salvo `--sobrescrever`), define `titulo_amigavel` e mantém o restante do frontmatter.

## Vínculo ajuda → parâmetro

`scripts/ajuda_map.json` liga cada `ajuda_id` do CSV ao `parametro_id`. Entradas `origem: "auto"` vieram da posição do botão "?" no `.dfm`; `origem: "manual"` foram conferidas à mão (o script preserva o que já existe e só acrescenta ajudas novas). `parametroId: null` = ajuda que não é de parâmetro.

## Nomes das telas

`scripts/telas_nomes.json` mapeia o nome do grupo no catálogo (ASCII) para o nome exibido com acentos. Grupo novo no catálogo gera um aviso no console até ser incluído.

## Publicação (GitHub Pages)

1. Crie o repositório `documentacao_prioriza` (público) no GitHub e faça o push da `main`.
2. Em **Settings → Pages → Build and deployment**, escolha **Source: GitHub Actions**.
3. Cada push na `main` executa `.github/workflows/deploy.yml` e publica `dist/`.

Se o nome do repositório mudar, ajuste `base` em `vite.config.ts`.

## Scripts npm

| Comando | Faz |
|---|---|
| `npm run dev` | servidor local com hot reload |
| `npm run extrair` | regenera `src/data` a partir das fontes |
| `npm run build` | `extrair` + type-check + build em `dist/` |
| `npm run build:ci` | só type-check + build (usado no Actions) |
| `npm run hooks` | reativa o hook pre-commit, se necessário |
| `node scripts/listar.ts [grupo ...] [--sem-explicacao]` | lista parâmetros por grupo para revisão |
| `node scripts/importar_explicacoes.ts lote.json [--sobrescrever]` | importa explicações em lote para `content/parametros` |
