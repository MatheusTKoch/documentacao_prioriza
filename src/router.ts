import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import TelaPage from './pages/TelaPage.vue'
import ParametroPage from './pages/ParametroPage.vue'
import BuscaPage from './pages/BuscaPage.vue'
import StatusPage from './pages/StatusPage.vue'

// Hash history: funciona no GitHub Pages sem fallback de 404.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/tela/:slug', component: TelaPage, props: true },
    { path: '/parametro/:id', component: ParametroPage, props: (r) => ({ id: Number(r.params.id) }) },
    { path: '/busca', component: BuscaPage },
    { path: '/status', component: StatusPage },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(_to, _from, salvo) {
    return salvo ?? { top: 0 }
  },
})
