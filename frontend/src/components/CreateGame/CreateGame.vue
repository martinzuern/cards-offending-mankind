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

          <b-form class="background-white" @submit.prevent="onSubmit">
            <b-form-group label="Your Name" label-for="nickname">
              <b-form-input
                id="nickname"
                v-model="player.nickname"
                type="text"
                placeholder="Zaphord"
                required
                minlength="3"
              ></b-form-input>
            </b-form-group>

            <b-form-group label="Active game packs" label-for="packs">
              <b-form-select id="packs" v-model="game.packs" multiple required>
                <b-form-select-option v-for="pack in officialPacks" :key="pack.name" :value="pack">
                  {{ pack.name }}
                </b-form-select-option>
              </b-form-select>
            </b-form-group>

            <b-form-group label="Password (optional)" label-for="password">
              <b-form-input id="password" v-model="game.password" type="password" autocomplete="off"></b-form-input>
            </b-form-group>

            <b-button type="submit" variant="secondary" size="sm" class="mt-3">
              Create a new game
            </b-button>
          </b-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import { CreateGame, CreatePlayer, PackInformation, MessageCreateGame, MessageGameCreated } from '../../../types';
import store from '../../store';

export default Vue.extend({
  name: 'CreateGame',
  data() {
    return {
      game: {
        password: '',
        packs: [],
      } as CreateGame,
      player: {
        nickname: '',
      } as CreatePlayer,
      errors: [] as unknown[],
    };
  },
  computed: {
    officialPacks(): PackInformation[] {
      return this.packs.filter((p) => p.official);
    },
    packs(): PackInformation[] {
      return store.state.packs;
    },
  },
  mounted() {
    store.dispatch.fetchPacks();
  },
  methods: {
    onSubmit(): void {
      const { game, player } = this;
      const data: MessageCreateGame = { game, player };
      store.dispatch
        .createGame({ data })
        .then((data: MessageGameCreated) => {
          const { id: gameId } = data.game;
          this.$router.push({ name: 'Game', params: { gameId } });
        })
        .catch((err: Error) => {
          console.error(err);
          this.errors.push(err);
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
