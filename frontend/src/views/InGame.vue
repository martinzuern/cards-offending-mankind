<template>
  <div>
    <h1>Hello {{ player.nickname }}</h1>
    <h1>Your GameId is {{ game.id }}</h1>
    <GameState />
    <Deck />
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import GameState from '@/components/InGame/GameState.vue'
import Deck from '@/components/InGame/Deck.vue'

export default Vue.extend({
  name: 'InGame',
  components: {
    GameState,
    Deck,
  },
  computed: {
    game() {
      return this.$store.state.game
    },
    player() {
      return this.$store.state.player
    },
  },
})
</script>
