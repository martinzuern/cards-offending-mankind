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
          <h6 v-if="game.id" class="mt-2 text-muted">
            <template v-if="gameId && gameToken">
              Seems like you dropped out
            </template>
            <template v-else>
              Joining an existing game
            </template>
          </h6>
          <div class="background-white">
            <template v-if="gameId && game.status !== 'created'">
              You cannot join this game as it has already started.
            </template>
            <template v-else>
              <template v-if="!gameToken">
                <label for="nickname">Your Name</label>
                <div class="input-group mb-3">
                  <input
                    id="nickname"
                    v-model="player.nickname"
                    type="text"
                    class="form-control"
                    placeholder="Zaphord"
                    aria-label="Your Nickname"
                    aria-describedby="player-nickname"
                  />
                </div>
                <template v-if="!gameId">
                  <label for="packs">Active game packs</label>
                  <select id="packs" v-model="game.packs" multiple class="form-control mb-3">
                    <option v-for="pack in officialPacks" :key="pack.name" :value="pack">{{ pack.name }}</option>
                  </select>
                </template>
                <div v-if="game.hasPassword || !gameId">
                  <label for="password">Password <span v-if="!gameId">(optional)</span></label>
                  <div class="input-group">
                    <input
                      id="password"
                      v-model="game.password"
                      type="password"
                      class="form-control"
                      placeholder="Magrathea"
                      aria-label="Game password"
                    />
                  </div>
                </div>
                <button
                  v-if="!gameId"
                  class="d-block btn btn-secondary btn-sm mt-3"
                  type="button"
                  @click="clickNewGame('create')"
                >
                  Create a new game
                </button>
              </template>
              <template v-if="!gameId">
                <div class="pt-3">
                  <hr />
                  <a href="javascript:;" @click="joinGame = true">Join an existing game</a>
                </div>
                <div v-show="joinGame" class="input-group mt-3">
                  <input
                    v-model="game.id"
                    type="text"
                    class="form-control"
                    placeholder="Enter game ID"
                    aria-label="Enter game ID"
                    aria-describedby="game-id"
                  />
                </div>
              </template>
              <div class="input-group-append">
                <button
                  v-if="gameId || joinGame"
                  class="btn btn-secondary btn-sm mt-3"
                  type="button"
                  @click="clickJoinGame"
                >
                  Join Game
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Game, Player, Pack } from '../../../types';
import 'bootstrap/dist/css/bootstrap.css';
import Vue from 'vue';

export default Vue.extend({
  name: 'Form',
  props: {
    gameId: {
      type: String,
      required: false,
    },
    gameToken: {
      type: String,
      required: false,
    },
  },
  data() {
    return {
      joinGame: false as boolean,
      player: {} as Player,
      errors: [] as any[],
      password: '' as string,
    };
  },
  computed: {
    officialPacks(): Pack[] {
      return this.packs.filter((p) => p.official);
    },
    packs(): Pack[] {
      return this.$store.state.packs;
    },
    game: {
      get(): Game {
        return this.$store.state.game;
      },
      set(value: Game): void {
        this.$store.commit('setGame', value);
      },
    },
  },
  mounted() {
    this.getPacks();

    if (this.gameId) {
      this.getGameInfo();
    }
  },
  methods: {
    getGameInfo(): void {
      this.$store.dispatch('executeAPI', {
        action: 'game.get',
        id: this.gameId,
      });
    },
    getPacks(): void {
      this.$store.dispatch('executeAPI', {
        action: 'packs.get',
      });
    },
    clickNewGame(): void {
      const { game, player } = this;
      // @ts-ignore
      this.$store
        .dispatch('executeAPI', {
          action: 'game.create',
          payload: {
            game,
            player,
          },
        })
        .then(({ data }) => {
          this.$router.push({ name: 'AccessGame', params: { gameId: data.game.id } });
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
            password: this.game.password,
          },
        })
        .then(() => {
          // @ts-ignore
          !this.gameId && this.$router.push({ name: 'AccessGame', params: { gameId: this.game.id } });
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
  color: black

a
  color: black
  &:hover
    color: lighten(black, 20)
</style>
