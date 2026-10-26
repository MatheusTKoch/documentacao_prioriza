<script setup lang="ts">
import { computed } from 'vue'
import { meta, parametros, passaFiltro, telas } from '../data'

const visiveis = computed(() => parametros.filter(passaFiltro))
const contagem = computed(() => {
  const m = new Map<string, number>()
  for (const p of visiveis.value) m.set(p.grupoSlug, (m.get(p.grupoSlug) ?? 0) + 1)
  return m
})
const dataGeracao = new Date(meta.geradoEm).toLocaleDateString('pt-BR')
</script>

<template>
  <section class="hero">
    <span class="badge rosa">Documentação</span>
    <h1>Parâmetros do Prioriza ERP</h1>
    <p class="suave">
      Cada parâmetro explicado em linguagem simples: o que ele faz, quais valores aceita e em quais telas do sistema ele é usado.
      Use a busca acima (tecla <code>/</code>) ou navegue pelas telas.
    </p>
    <div class="numeros">
      <div><strong>{{ parametros.length }}</strong><span>parâmetros</span></div>
      <div><strong>{{ telas.length }}</strong><span>telas</span></div>
      <div><strong>{{ meta.totais.comUsos }}</strong><span>com uso mapeado no código</span></div>
      <div><strong>{{ meta.versoes.join(' · ') }}</strong><span>versões analisadas</span></div>
    </div>
  </section>

  <p class="titulo-secao">Telas do sistema</p>
  <div class="grade-telas">
    <RouterLink v-for="t in telas" :key="t.slug" :to="`/tela/${t.slug}`" class="card tela">
      <div class="cab">
        <h3>{{ t.nome }}</h3>
        <span class="qtd mono">{{ contagem.get(t.slug) ?? 0 }}</span>
      </div>
      <p v-if="t.descricao" class="suave">{{ t.descricao }}</p>
    </RouterLink>
  </div>

  <p class="rodape fraco">Dados gerados em {{ dataGeracao }} a partir do catálogo de parâmetros, do código-fonte das versões {{ meta.versoes.join(' e ') }} e dos textos de ajuda do sistema.</p>
</template>

<style scoped>
.hero {
  padding: 8px 0 28px;
  max-width: 760px;
}
.hero h1 {
  font-size: clamp(28px, 4vw, 40px);
  margin: 12px 0 10px;
}
.numeros {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  margin-top: 22px;
}
.numeros strong {
  display: block;
  font-size: 24px;
  font-family: var(--mono);
  color: var(--verde-400);
}
.numeros span {
  font-size: 13px;
  color: var(--texto-suave);
}
.grade-telas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.tela {
  color: var(--texto);
  transition: border-color 0.12s ease, transform 0.12s ease;
}
.tela:hover {
  border-color: var(--verde-400);
  transform: translateY(-2px);
}
.tela .cab {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
}
.tela h3 {
  font-size: 15px;
}
.tela p {
  font-size: 13px;
  margin: 8px 0 0;
}
.qtd {
  color: var(--rosa-claro);
  font-size: 13px;
}
.rodape {
  margin-top: 36px;
  font-size: 12px;
}
</style>
