<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ItemParametro from '../components/ItemParametro.vue'
import { buscar, filtros } from '../data'

const route = useRoute()
const q = computed(() => (route.query.q as string) ?? '')
// `filtros` entra na dependencia para a lista reagir aos filtros da sidebar
const resultados = computed(() => (filtros.tipo, filtros.versao, filtros.mostrarLegado, buscar(q.value)))
</script>

<template>
  <h1>Resultados para “{{ q }}”</h1>
  <p class="fraco contagem">
    {{ resultados.length ? `${resultados.length} parâmetro${resultados.length === 1 ? '' : 's'}` : 'Nada encontrado' }}
    <span v-if="!filtros.mostrarLegado"> · parâmetros legados estão ocultos (ajuste no menu lateral)</span>
  </p>
  <div class="lista-parametros">
    <ItemParametro v-for="p in resultados" :key="p.id" :p="p" mostrar-grupo />
  </div>
  <div v-if="!resultados.length" class="card suave">
    Tente outras palavras (por exemplo, o nome da tela: <em>PDV</em>, <em>nota fiscal</em>, <em>pedido</em>) ou o número do parâmetro.
  </div>
</template>

<style scoped>
h1 {
  font-size: 24px;
}
.contagem {
  font-size: 13px;
  margin: 8px 0 18px;
}
</style>
