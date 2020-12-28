<template>
  <b-container>
    <b-row class="justify-content-md-center">
      <b-col sm="12" lg="10" xl="8">
        <div class="ml-0 form-card-header w-100 mx-auto">
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

<style lang="sass" scoped>
.background-white
  background-color: white
  margin: 1rem -1.5rem -1.5rem
  box-shadow: $box-shadow-card
  padding: 1rem
  border-radius: 15px
  color: black

.form-card-header
  border-radius: $border-radius
  box-shadow: $box-shadow-card
  padding: .8rem
  margin: .5rem
  font-weight: bold
  background-color: black
  color: white

  .card-back
    font-size: 2.5em
    line-height: 1em
    font-weight: 700

a
  color: black
  &:hover
    color: lighten(black, 20)
</style>
