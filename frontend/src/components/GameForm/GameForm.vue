<template>
  <b-container>
    <b-row>
      <b-col>
        <div class="ml-0 play-card black-card w-75 mx-auto">
          <div class="pt-3 mt-3 mr-3 card-back">
            Cards
            <br />
            Offending
            <br />
            Mankind
          </div>

          <div class="background-white">
            <slot></slot>
          </div>
        </div>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'GameForm',
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="sass">

.background-white
  background-color: white
  margin: 1rem -1rem -1rem
  padding: 1rem
  border-bottom-left-radius: 15px
  border-bottom-right-radius: 15px
  color: black

.card-back
  font-size: 2.5em
  line-height: 1em
  font-weight: 700

a
  color: black
  &:hover
    color: lighten(black, 20)
</style>
