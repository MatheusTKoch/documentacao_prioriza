<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import { nomeTelaUso, porId, telaPorSlug, titulo } from '../data'

const props = defineProps<{ id: number }>()
const p = computed(() => porId.get(props.id))
const tela = computed(() => (p.value ? telaPorSlug.get(p.value.grupoSlug) : undefined))

const explicacaoHtml = computed(() => (p.value?.explicacao ? (marked.parse(p.value.explicacao, { async: false }) as string) : ''))

/** Texto curto "o que faz": explicacao revisada > resumo da ajuda > hint > comentario do catalogo. */
const oQueFaz = computed(() => {
  const x = p.value
  if (!x) return ''
  return x.ajuda?.resumo || x.hint || x.comentario || ''
})

const formatarValor = (v: string) => v.replace(/^#/, '').trim()

const usosForms = computed(() => (p.value?.usos ?? []).filter((u) => u.tipo === 'form'))
const usosOutros = computed(() => (p.value?.usos ?? []).filter((u) => u.tipo !== 'form'))

const ondeLegivel = computed(() => {
  const o = p.value?.onde ?? ''
  if (o === 'TODAS') return 'Todas as versões'
  if (o === 'TELA') return 'Só aparece na tela (sem efeito no código)'
  if (o === '-' || !o) return 'Sem uso atual'
  return 'Versões ' + o.replace(/\+/g, ' e ')
})

const vizinhos = computed(() => {
  const ids = tela.value?.ids ?? []
  const i = ids.indexOf(props.id)
  return { anterior: i > 0 ? ids[i - 1] : null, proximo: i >= 0 && i < ids.length - 1 ? ids[i + 1] : null }
})
</script>

<template>
  <div v-if="!p" class="card">
    Parâmetro <span class="id-chip">#{{ id }}</span> não está no catálogo. <RouterLink to="/">Voltar ao início</RouterLink>.
  </div>

  <article v-else>
    <nav class="trilha fraco">
      <RouterLink to="/">Início</RouterLink> /
      <RouterLink :to="`/tela/${p.grupoSlug}`">{{ p.grupo }}</RouterLink>
    </nav>

    <header class="cabecalho">
      <div class="id-grande">#{{ p.id }}</div>
      <div>
        <h1>{{ titulo(p) }}</h1>
        <p v-if="titulo(p) !== p.descricao" class="suave descricao-tecnica">
          Nome no sistema: <span class="mono">{{ p.descricao }}</span>
        </p>
        <div class="badges">
          <span class="badge" :class="p.tipo === 'EMPRESA' ? 'verde' : 'claro'" :title="p.tipo === 'EMPRESA' ? 'Configurado por empresa' : 'Vale para o sistema inteiro'">
            {{ p.tipo === 'EMPRESA' ? 'Por empresa' : 'Sistema' }}
          </span>
          <span v-if="p.uso === 'LEGADO'" class="badge rosa">Legado (sem uso atual)</span>
          <span v-else-if="p.uso === 'TELA'" class="badge contorno">Apenas informativo na tela</span>
          <span class="badge contorno" :title="'Onde: ' + p.onde">{{ ondeLegivel }}</span>
          <span v-for="v in p.versoes" :key="v" class="badge contorno mono">v{{ v }}</span>
        </div>
      </div>
    </header>

    <div v-if="!p.revisado" class="aviso">
      <span>!</span>
      <span>
        <template v-if="p.explicacao">Esta explicação é um rascunho gerado a partir do código e ainda não foi revisada pela equipe.</template>
        <template v-else>Este parâmetro ainda não tem explicação escrita. As informações abaixo vêm direto do sistema.</template>
      </span>
    </div>

    <section v-if="oQueFaz" class="card destaque">
      <p class="titulo-secao">O que faz</p>
      <p class="texto-destaque">{{ oQueFaz }}</p>
    </section>

    <section v-if="p.explicacao" class="card">
      <p class="titulo-secao">Explicação</p>
      <div class="markdown" v-html="explicacaoHtml"></div>
    </section>

    <div class="grade-2">
      <section class="card">
        <p class="titulo-secao">Onde configurar</p>
        <p v-if="p.aba.length">
          Tela <strong>Parâmetros</strong>
          <template v-for="(a, i) in p.aba" :key="i"> › <strong>{{ a }}</strong></template>
        </p>
        <p v-else class="suave">Não aparece na tela de Parâmetros; valor definido direto no banco ou por outra tela.</p>
        <p v-if="p.caption && p.caption !== titulo(p)" class="suave rotulo">Rótulo na tela: “{{ p.caption }}”</p>
        <p v-if="p.hint && p.hint !== oQueFaz" class="suave rotulo">Dica na tela: “{{ p.hint }}”</p>
      </section>

      <section class="card">
        <p class="titulo-secao">Valores possíveis</p>
        <ul v-if="p.opcoes.length" class="opcoes">
          <li v-for="o in p.opcoes" :key="o"><code>{{ formatarValor(o) }}</code></li>
        </ul>
        <p v-else class="suave">Texto, número ou código informado livremente (não há lista fixa de opções).</p>
      </section>
    </div>

    <section v-if="p.ajuda" class="card">
      <p class="titulo-secao">Ajuda do sistema (botão “?”)</p>
      <p class="ajuda-titulo">{{ p.ajuda.titulo }}</p>
      <p v-if="p.ajuda.resumo && p.ajuda.resumo !== oQueFaz">{{ p.ajuda.resumo }}</p>
      <p v-if="p.ajuda.detalhamento" class="suave detalhamento">{{ p.ajuda.detalhamento }}</p>
    </section>

    <section class="card">
      <p class="titulo-secao">Onde é usado</p>
      <p v-if="!p.usos.length" class="suave">Nenhuma referência encontrada no código das versões analisadas.</p>
      <template v-else>
        <ul v-if="usosForms.length" class="usos">
          <li v-for="u in usosForms" :key="u.unit">
            <strong>{{ nomeTelaUso(u.unit, u.tela) }}</strong>
            <span class="fraco mono"> {{ u.unit }}</span>
            <span class="fraco"> · {{ u.versoes.map((v) => 'v' + v).join(', ') }}</span>
            <span v-if="u.gravacoes" class="badge contorno">grava</span>
          </li>
        </ul>
        <details v-if="usosOutros.length" class="outros">
          <summary class="suave">Regras internas e módulos ({{ usosOutros.length }})</summary>
          <ul class="usos">
            <li v-for="u in usosOutros" :key="u.unit">
              <span class="mono">{{ u.unit }}</span>
              <span class="fraco"> · {{ u.tipo === 'classe' ? 'classe' : u.tipo === 'datamodule' ? 'módulo de dados' : u.pasta }} · {{ u.versoes.map((v) => 'v' + v).join(', ') }}</span>
            </li>
          </ul>
        </details>
      </template>
    </section>

    <nav class="navegacao">
      <RouterLink v-if="vizinhos.anterior" :to="`/parametro/${vizinhos.anterior}`">← #{{ vizinhos.anterior }} {{ titulo(porId.get(vizinhos.anterior)!) }}</RouterLink>
      <span v-else></span>
      <RouterLink v-if="vizinhos.proximo" :to="`/parametro/${vizinhos.proximo}`" class="dir">#{{ vizinhos.proximo }} {{ titulo(porId.get(vizinhos.proximo)!) }} →</RouterLink>
    </nav>
  </article>
</template>

<style scoped>
article {
  display: grid;
  gap: 14px;
}
.trilha {
  font-size: 13px;
}
.cabecalho {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 18px;
  align-items: start;
  margin-bottom: 6px;
}
.id-grande {
  font-family: var(--mono);
  font-weight: 600;
  font-size: 30px;
  color: var(--rosa);
  padding: 6px 12px;
  border-radius: 12px;
  background: rgba(229, 101, 109, 0.12);
  line-height: 1.2;
}
h1 {
  font-size: clamp(22px, 3vw, 30px);
}
.descricao-tecnica {
  margin: 6px 0 0;
  font-size: 13px;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.destaque {
  border-color: var(--verde-500);
}
.texto-destaque {
  margin: 0;
  font-size: 17px;
  line-height: 1.5;
}
.rotulo {
  font-size: 13px;
  margin: 6px 0 0;
}
.opcoes {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.opcoes code {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--verde-800);
  border: 1px solid var(--borda);
}
.ajuda-titulo {
  font-weight: 600;
  margin: 0 0 8px;
}
.detalhamento {
  margin: 0;
  white-space: pre-line;
}
.usos {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.usos .badge {
  margin-left: 8px;
}
.outros {
  margin-top: 12px;
}
.outros summary {
  cursor: pointer;
  font-size: 13px;
}
.outros ul {
  margin-top: 8px;
  font-size: 13px;
}
.navegacao {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 10px;
  font-size: 13px;
}
.navegacao .dir {
  text-align: right;
}
@media (max-width: 700px) {
  .cabecalho {
    grid-template-columns: 1fr;
  }
}
</style>
