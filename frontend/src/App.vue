<template>
  <div class="d-flex flex-column min-vh-100">
    <b-container id="app" class="my-5 flex-fill" :class="{ 'd-flex align-items-center': isHomeView }">
      <b-row :class="{ 'w-100 m-0': isHomeView }">
        <b-col>
          <router-view></router-view>
        </b-col>
      </b-row>
    </b-container>

    <footer class="py-2 mt-5 bg-light bg-gradient text-black-50 w-100">
      <b-container class="text-center">
        <small>
          Contains content from
          <a href="https://cardsagainsthumanity.com" target="_blank">Cards Against Humanity®</a>
          via <a href="https://crhallberg.com/cah/" target="_blank">JSON Against Humanity</a>, licensed under
          <b-icon icon="badge-cc">CC</b-icon>&nbsp;
          <a href="https://creativecommons.org/licenses/by-nc-sa/2.0/" target="_blank">BY-NC-SA 2.0</a>.
        </small>
      </b-container>
    </footer>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import 'typeface-inter';
import 'bootstrap/dist/css/bootstrap.css';

export default Vue.extend({
  name: 'App',
  components: {},
  computed: {
    isHomeView(): boolean {
      return this.$route.name === 'Home';
    },
  },
});
</script>

<style lang="sass">
html
  font-family: 'Inter', Helvetica, sans-serif
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale

@supports (font-variation-settings: normal)
  html
    font-family: 'Inter var', Helvetica, sans-serif

// Bootstrap overrides
small
  font-size: 70%

a
  color: black
  &:hover
    color: lighten(black, 20)

.card
  box-shadow: $box-shadow-card
  border-color: transparent
  border-radius: 7px

.alert
  font-weight: initial

@include media-breakpoint-down(sm)
  .sticky-bottom-sm
    position: sticky
    bottom: 1rem
</style>

<style lang="sass" scoped>
#app
  text-align: left
  color: #2c3e50
</style>
