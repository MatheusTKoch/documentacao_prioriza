<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import SearchBar from './components/SearchBar.vue'

const sidebarAberta = ref(window.innerWidth > 900)
const route = useRoute()

onMounted(() => {
  const salvo = localStorage.getItem('sidebar')
  if (salvo !== null && window.innerWidth > 900) sidebarAberta.value = salvo === '1'
})

watch(sidebarAberta, (v) => localStorage.setItem('sidebar', v ? '1' : '0'))

// no celular, fecha o menu ao navegar
watch(
  () => route.fullPath,
  () => {
    if (window.innerWidth <= 900) sidebarAberta.value = false
  },
)
</script>

<template>
  <div class="app" :class="{ 'sidebar-fechada': !sidebarAberta }">
    <AppSidebar @fechar="sidebarAberta = false" />

    <header class="header">
      <button class="btn-icone" :aria-label="sidebarAberta ? 'Ocultar menu' : 'Mostrar menu'" @click="sidebarAberta = !sidebarAberta">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <SearchBar />
      <RouterLink to="/status" class="link-status fraco" title="Cobertura e pendencias da documentacao">status</RouterLink>
    </header>

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.link-status {
  font-size: 13px;
  margin-left: auto;
}
</style>
