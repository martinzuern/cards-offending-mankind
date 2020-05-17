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
import Vue from 'vue'
import io from 'socket.io-client'
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
  mounted() {
    if (localStorage.token) {
      // const websocket = io.connect(process.env.VUE_APP_BACKEND_URL)
      const websocket = io.connect(process.env.VUE_APP_BACKEND_URL, { autoConnect: false })
      websocket.on('connect', () => {
        console.log('connecting')
        websocket.on('authenticated', () => {
          console.log('authenticated')
        }).emit('authenticate', { token: (localStorage.player || {}).token })
      })
      websocket.open()
    }
  },
})
</script>
