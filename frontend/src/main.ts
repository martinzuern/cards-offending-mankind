import Vue from 'vue';
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
import * as Sentry from '@sentry/vue';

// https://github.com/justinkames/vuejs-logger/issues/33#issuecomment-602581261
import VueLoggerPlugin from 'vuejs-logger/dist/vue-logger';

import App from './App.vue';
import router from './router';
import store from './store';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

const isProduction = process.env.NODE_ENV === 'production';

Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

Vue.use(VueLoggerPlugin, {
  logLevel: isProduction ? 'error' : 'debug',
  showLogLevel: true,
  showMethodName: true,
  separator: '|',
  showConsoleColors: true,
});

Sentry.init({
  Vue: Vue,
  dsn: process.env.VUE_APP_FRONTEND_SENTRY_DSN || null,
  release: process.env.VUE_APP_SHA,
});

new Vue({
  router,
  store: store.original,
  beforeCreate(): void {
    store.commit.initializeStore();
  },
  render: (h): Vue.VNode => h(App),
}).$mount('#app');
