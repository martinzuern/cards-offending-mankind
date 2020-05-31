<template>
  <div class="container">
    <div class="row">
      <div class="col">
        <div class="ml-0 play-card black-card w-75 mx-auto">
          <div class="pt-5 mt-5 mr-3">
            Cards offending
            <br />
            mankind
          </div>
          <div class="background-white">
            <div class="input-group mt-3">
              <input
                v-model="player.nickname"
                type="text"
                class="form-control"
                placeholder="Your Nickname"
                aria-label="Your Nickname"
                aria-describedby="player-nickname"
              />
            </div>
            <button class="btn btn-secondary btn-sm mt-3" type="button" @click="clickNewGame('create')">
              Create a new game
            </button>
            <div class="pt-3">
              <hr />
              <a href="javascript:;" @click="joinGame = true">Join an existing game</a>
            </div>
            <div v-show="joinGame">
              <div class="input-group mt-3">
                <input
                  v-model="game.id"
                  type="text"
                  class="form-control"
                  placeholder="Enter game ID"
                  aria-label="Enter game ID"
                  aria-describedby="game-id"
                />
                <div class="input-group-append">
                  <button class="btn btn-secondary" type="button" @click="clickJoinGame">Join Game</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Game, Player } from '../../../types';
import 'bootstrap/dist/css/bootstrap.css';
import Vue from 'vue';

export default Vue.extend({
  name: 'Form',
  data() {
    return {
      joinGame: false as boolean,
      player: {} as Player,
      errors: [] as any[],
    };
  },
  computed: {
    game: {
      get() {
        return this.$store.state.game as Game;
      },
      set(value) {
        this.$store.commit('setGame', value);
      },
    },
  },
  methods: {
    clickNewGame() {
      const { game, player } = this;
      // @ts-ignore
      game.packs = [{ abbr: 'BaseUK' }];
      this.$store
        .dispatch('executeAPI', {
          action: 'game.create',
          payload: {
            game,
            player,
          },
        })
        .then(({ data }) => {
          this.$router.push({ name: 'InGame', params: { gameId: data.game.id } });
        })
        .catch((errors) => {
          this.errors = errors;
        });
    },
    clickJoinGame() {
      this.$store
        .dispatch('executeAPI', {
          action: 'game.join',
          // @ts-ignore
          id: this.game.id,
          payload: {
            nickname: this.player.nickname,
          },
        })
        .then(({ data }) => {
          // @ts-ignore
          this.$router.push({ name: 'InGame', params: { gameId: this.game.id } });
        })
        .catch((errors) => {
          this.errors = errors;
        });
    },
  },
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

a
  color: black
  &:hover
    color: lighten(black, 20)
</style>
