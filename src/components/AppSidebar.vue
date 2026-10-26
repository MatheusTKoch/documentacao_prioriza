<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { filtros, meta, parametros, passaFiltro, telas, totalVisivel } from '../data'

defineEmits<{ fechar: [] }>()
const route = useRoute()

const contagem = computed(() => {
  const m = new Map<string, number>()
  for (const p of parametros) {
    if (!passaFiltro(p)) continue
    m.set(p.grupoSlug, (m.get(p.grupoSlug) ?? 0) + 1)
  }
  return m
})

const slugAtivo = computed(() => (route.params.slug as string) ?? '')
</script>

<template>
  <aside class="sidebar">
    <div class="topo">
      <RouterLink to="/" class="marca">
        <img class="logo" src="/mark.png" alt="Prioriza" width="36" height="36" />
        <span>
          <strong>Prioriza ERP</strong>
          <small>Parâmetros do sistema</small>
        </span>
      </RouterLink>
      <button class="btn-icone fechar" aria-label="Fechar menu" @click="$emit('fechar')">×</button>
    </div>

    <div class="filtros">
      <label>
        <span>Tipo</span>
        <select v-model="filtros.tipo">
          <option value="">Todos</option>
          <option value="EMPRESA">Empresa</option>
          <option value="SISTEMA">Sistema</option>
        </select>
      </label>
      <label>
        <span>Versão</span>
        <select v-model="filtros.versao">
          <option value="">Todas</option>
          <option v-for="v in meta.versoes" :key="v" :value="v">{{ v }}</option>
        </select>
      </label>
      <label class="check">
        <input v-model="filtros.mostrarLegado" type="checkbox" />
        <span>Mostrar legado</span>
      </label>
      <div class="total fraco">{{ totalVisivel }} de {{ parametros.length }} parâmetros</div>
    </div>

    <nav>
      <p class="titulo-secao">Telas</p>
      <RouterLink
        v-for="t in telas"
        :key="t.slug"
        :to="`/tela/${t.slug}`"
        class="item"
        :class="{ ativo: slugAtivo === t.slug, vazio: !contagem.get(t.slug) }"
      >
        <span class="nome">{{ t.nome }}</span>
        <span class="qtd">{{ contagem.get(t.slug) ?? 0 }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
}
.marca {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--texto);
}
.marca strong {
  display: block;
  font-size: 15px;
}
.marca small {
  display: block;
  font-size: 12px;
  color: var(--texto-suave);
}
.logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}
.fechar {
  display: none;
}
.filtros {
  padding: 6px 16px 14px;
  border-bottom: 1px solid var(--borda);
  display: grid;
  gap: 8px;
}
.filtros label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--texto-suave);
}
.filtros select {
  background: var(--verde-800);
  border: 1px solid var(--borda);
  border-radius: 8px;
  padding: 4px 8px;
  color: var(--texto);
  min-width: 120px;
}
.filtros .check {
  justify-content: flex-start;
}
.filtros input[type='checkbox'] {
  accent-color: var(--rosa);
}
.total {
  font-size: 12px;
}
nav {
  padding: 14px 10px 24px;
}
nav .titulo-secao {
  padding: 0 8px;
}
.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--texto-suave);
  font-size: 14px;
}
.item:hover {
  background: var(--verde-800);
  color: var(--texto);
}
.item.ativo {
  background: var(--verde-700);
  color: var(--texto);
}
.item.vazio {
  opacity: 0.45;
}
.qtd {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--verde-400);
}
.item.ativo .qtd {
  color: var(--rosa-claro);
}
@media (max-width: 900px) {
  .fechar {
    display: inline-flex;
  }
}
</style>
