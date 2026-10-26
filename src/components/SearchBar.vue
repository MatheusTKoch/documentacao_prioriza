<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const texto = ref((route.query.q as string) ?? '')
const campo = ref<HTMLInputElement | null>(null)
let timer: number | undefined

watch(texto, (v) => {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    const q = v.trim()
    if (q) router.replace({ path: '/busca', query: { q } })
    else if (route.path === '/busca') router.replace('/')
  }, 180)
})

watch(
  () => route.query.q,
  (q) => {
    if (route.path === '/busca' && typeof q === 'string' && q !== texto.value) texto.value = q
    if (route.path !== '/busca' && texto.value && !q) texto.value = ''
  },
)

function atalho(e: KeyboardEvent) {
  if (e.key === '/' && document.activeElement !== campo.value && !(e.target instanceof HTMLInputElement)) {
    e.preventDefault()
    campo.value?.focus()
  }
  if (e.key === 'Escape' && document.activeElement === campo.value) {
    texto.value = ''
    campo.value?.blur()
  }
}
onMounted(() => window.addEventListener('keydown', atalho))
onUnmounted(() => window.removeEventListener('keydown', atalho))
</script>

<template>
  <div class="busca">
    <svg class="lupa" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
    <input
      ref="campo"
      v-model="texto"
      type="search"
      placeholder="Buscar por número, nome, o que faz ou tela onde é usado…"
      autocomplete="off"
      spellcheck="false"
    />
    <kbd v-if="!texto">/</kbd>
  </div>
</template>

<style scoped>
.busca {
  flex: 1;
  max-width: 720px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 42px;
  border-radius: 12px;
  background: var(--verde-900);
  border: 1px solid var(--borda);
}
.busca:focus-within {
  border-color: var(--verde-400);
}
.lupa {
  color: var(--verde-400);
  flex: none;
}
input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  color: var(--texto);
  min-width: 0;
}
input::placeholder {
  color: var(--texto-fraco);
}
input::-webkit-search-cancel-button {
  filter: invert(1);
}
kbd {
  font-family: var(--mono);
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 6px;
  border: 1px solid var(--borda);
  color: var(--texto-fraco);
}
</style>
