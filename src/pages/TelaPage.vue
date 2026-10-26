<script setup lang="ts">
import { computed } from 'vue'
import ItemParametro from '../components/ItemParametro.vue'
import { passaFiltro, porId, telaPorSlug } from '../data'

const props = defineProps<{ slug: string }>()

const tela = computed(() => telaPorSlug.get(props.slug))
const itens = computed(() => (tela.value?.ids ?? []).map((id) => porId.get(id)!).filter((p) => p && passaFiltro(p)))
const ocultos = computed(() => (tela.value?.ids.length ?? 0) - itens.value.length)
</script>

<template>
  <div v-if="!tela" class="card">Tela não encontrada. <RouterLink to="/">Voltar ao início</RouterLink>.</div>
  <template v-else>
    <nav class="trilha fraco"><RouterLink to="/">Início</RouterLink> / Telas</nav>
    <h1>{{ tela.nome }}</h1>
    <p v-if="tela.descricao" class="suave desc">{{ tela.descricao }}</p>
    <p class="fraco contagem">
      {{ itens.length }} parâmetro{{ itens.length === 1 ? '' : 's' }}
      <span v-if="ocultos"> · {{ ocultos }} oculto{{ ocultos === 1 ? '' : 's' }} pelos filtros</span>
    </p>
    <div class="lista-parametros">
      <ItemParametro v-for="p in itens" :key="p.id" :p="p" />
    </div>
  </template>
</template>

<style scoped>
.trilha {
  font-size: 13px;
  margin-bottom: 8px;
}
h1 {
  font-size: 28px;
}
.desc {
  margin: 6px 0 0;
  max-width: 720px;
}
.contagem {
  font-size: 13px;
  margin: 10px 0 18px;
}
</style>
