<script setup lang="ts">
import { meta, parametros } from '../data'

const t = meta.totais
const naoRevisados = parametros.filter((p) => !p.revisado)
const pct = (n: number) => Math.round((n / parametros.length) * 100)
const linhas = [
  ['Com componente na tela de Parâmetros', t.comTela],
  ['Com texto de ajuda (botão "?")', t.comAjuda],
  ['Com hint na tela', t.comHint],
  ['Com uso mapeado no código', t.comUsos],
  ['Com explicação escrita', t.explicados],
  ['Com explicação revisada', t.revisados],
] as const
</script>

<template>
  <h1>Status da documentação</h1>
  <p class="suave">Gerado em {{ new Date(meta.geradoEm).toLocaleString('pt-BR') }} · versões {{ meta.versoes.join(', ') }} · próximo ID livre: <code>{{ meta.proximoIdLivre ?? '—' }}</code></p>

  <div class="card tabela">
    <div v-for="[nome, n] in linhas" :key="nome" class="linha">
      <span>{{ nome }}</span>
      <span class="barra"><i :style="{ width: pct(n) + '%' }"></i></span>
      <span class="mono">{{ n }} <small class="fraco">({{ pct(n) }}%)</small></span>
    </div>
  </div>

  <div class="grade-2 pendencias">
    <div class="card">
      <p class="titulo-secao">IDs usados no código mas fora do catálogo</p>
      <p v-if="!meta.idsForaDoCatalogo.length" class="fraco">Nenhum.</p>
      <p v-else class="mono">{{ meta.idsForaDoCatalogo.join(', ') }}</p>
    </div>
    <div class="card">
      <p class="titulo-secao">Sem uso no código e sem tela (não legado)</p>
      <p v-if="!meta.idsSemUsoNemTela.length" class="fraco">Nenhum.</p>
      <p v-else>
        <RouterLink v-for="id in meta.idsSemUsoNemTela" :key="id" :to="`/parametro/${id}`" class="id-chip chip">#{{ id }}</RouterLink>
      </p>
    </div>
    <div class="card">
      <p class="titulo-secao">Ajudas do sistema sem parâmetro vinculado</p>
      <p v-if="!meta.ajudasSemParametro.length" class="fraco">Nenhuma.</p>
      <ul v-else>
        <li v-for="a in meta.ajudasSemParametro" :key="a.ajudaId"><span class="mono">{{ a.ajudaId }}</span> · {{ a.titulo || '(sem título)' }}</li>
      </ul>
    </div>
    <div class="card">
      <p class="titulo-secao">Explicações pendentes de revisão</p>
      <p class="fraco">{{ naoRevisados.length }} de {{ parametros.length }}. Os primeiros:</p>
      <p>
        <RouterLink v-for="p in naoRevisados.slice(0, 40)" :key="p.id" :to="`/parametro/${p.id}`" class="id-chip chip">#{{ p.id }}</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
h1 {
  font-size: 26px;
}
.tabela {
  margin: 18px 0;
  display: grid;
  gap: 10px;
}
.linha {
  display: grid;
  grid-template-columns: 1fr 200px 110px;
  gap: 14px;
  align-items: center;
  font-size: 14px;
}
.barra {
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.barra i {
  display: block;
  height: 100%;
  background: var(--verde-400);
}
.pendencias ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
}
.chip {
  margin-right: 10px;
}
@media (max-width: 700px) {
  .linha {
    grid-template-columns: 1fr 90px;
  }
  .barra {
    display: none;
  }
}
</style>
