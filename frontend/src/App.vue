<template>
  <div id="app" class="container">
    <div class="row">
      <div class="col">
        <router-view></router-view>
      </div>
    </div>
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
//variables

$box-shadow-sketch: 0 1px 1px rgba(0, 0, 0, .04), 0 4px 5px rgba(0, 0, 0, .02), 0 7px 9px rgba(0, 0, 0, .04)
$box-shadow-card: $box-shadow-sketch, 0 25px 30px -15px rgba(0, 0, 0, .08), 0 15px 18px -30px rgba(0, 0, 0, .04)
$border-radius: 15px

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
  margin-top: 60px

.card
  box-shadow: $box-shadow-card
  border-color: transparent
  border-radius: 7px

.alert
  font-weight: initial

.play-card
  padding: 1rem
  border-radius: $border-radius
  box-shadow: $box-shadow-card
  margin: .5rem
  font-weight: bold

  &.black-card
    width: 300px
    background-color: black
    color: white

  &.white-card
    width: 200px
    transition: all .2s ease-out
    cursor: pointer
    background-color: white
    &.selected
      background-color: blue
      color: white
</style>
