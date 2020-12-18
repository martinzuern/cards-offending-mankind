<template>
  <div class="d-flex flex-column min-vh-100">
    <b-container id="app" class="my-5 flex-fill">
      <b-row>
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
});
</script>

<style lang="sass">
//font
html
  font-family: 'Inter', Helvetica, sans-serif
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale

@supports (font-variation-settings: normal)
  html
    font-family: 'Inter var', Helvetica, sans-serif

//styles
#app
  text-align: left
  color: #2c3e50

small
  font-size: 70%

.card
  box-shadow: $box-shadow-card
  border-color: transparent
  border-radius: 7px

.alert
  font-weight: initial

.play-card
  height: $card-height
  width: $card-width
  padding: .8rem
  border-radius: $border-radius
  box-shadow: $box-shadow-card
  margin: .5rem
  hyphens: auto
  font-weight: bold
  white-space: pre-wrap

  &.black-card
    height: 15rem
    width: 10rem
    background-color: black
    color: white

  &.white-card
    transition: all .2s ease-out
    cursor: pointer
    background-color: white
    border: 1px solid black
    &.selected
      background-color: blue
      color: white
      box-shadow: 0 0 9px 1px blue
</style>
