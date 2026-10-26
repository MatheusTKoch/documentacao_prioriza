<script setup lang="ts">
import { computed } from 'vue'
import { titulo } from '../data'
import type { Parametro } from '../types'

const props = defineProps<{ p: Parametro; mostrarGrupo?: boolean }>()

const resumo = computed(() => {
  const p = props.p
  const texto = p.explicacao.split(/\n\n/)[0] || p.ajuda?.resumo || p.hint || ''
  return texto.replace(/[*_`#>]/g, '').trim()
})
</script>

<template>
  <RouterLink :to="`/parametro/${p.id}`" class="item-parametro">
    <span class="id-chip">#{{ p.id }}</span>
    <span>
      <span class="nome">{{ titulo(p) }}</span>
      <span v-if="mostrarGrupo" class="fraco"> · {{ p.grupo }}</span>
      <div v-if="resumo" class="resumo">{{ resumo }}</div>
    </span>
    <span class="badges">
      <span class="badge contorno">{{ p.tipo === 'EMPRESA' ? 'Empresa' : 'Sistema' }}</span>
      <span v-if="p.uso === 'LEGADO'" class="badge contorno">Legado</span>
      <span v-if="!p.revisado && p.explicacao" class="badge contorno" title="Explicação ainda não revisada">rascunho</span>
    </span>
  </RouterLink>
</template>
