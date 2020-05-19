import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import NewGame from '../views/NewGame.vue';
import InGame from '../views/InGame.vue';

Vue.use(VueRouter);

const routes: RouteConfig[] = [
  {
    path: '/',
    name: 'NewGame',
    component: NewGame,
  },
  {
    path: '/games/:gameId',
    name: 'InGame',
    component: InGame,
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
