<template>
  <div class="container">
    <div class="row">
      <div class="col">
        <div class="input-group mt-3">
          <input
            v-model="player.nickname"
            type="text" class="form-control"
            placeholder="Your Nickname"
            aria-label="Your Nickname"
            aria-describedby="player-nickname">
        </div>
        <button
          @click="clickNewGame"
          class="btn btn-secondary mt-3"
          type="button">Host New Game</button>
        <div class="input-group mt-3">
          <input
            type="text"
            class="form-control"
            v-model="game.id"
            placeholder="Enter your game ID"
            aria-label="Enter your game ID"
            aria-describedby="game-id">
          <div class="input-group-append">
            <button
              class="btn btn-secondary"
              type="button"
              @click="clickNewGame">Join existing Game</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Game, Player } from '../../../types'
import 'bootstrap/dist/css/bootstrap.css';
import Vue from 'vue';

export default Vue.extend({
  name: 'Form',
  data() {
    return {
      player: {} as Player,
      game: {} as Game,
    }
  },
  methods: {
    clickNewGame() {
      const { game, player } = this
      this.$store.dispatch('executeAPI', {
        action: 'game.create',
        payload: {
          game,
          player,
        },
      }).then(({ data }) => {
        this.$router.push({ name: 'InGame', params: { gameId: data.game.id  } })
      })
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
