<template>
  <GameForm>
    <template v-if="loading">
      <div class="text-center my-3">
        <b-spinner label="Loading ..."></b-spinner>
      </div>
    </template>

    <template v-else>
      <b-form @submit.prevent="onSubmit">
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
    </template>
  </GameForm>
</template>

<script lang="ts">
import Vue from 'vue';

import GameForm from './GameForm.vue';
import { CreateGame, CreatePlayer, PackInformation, MessageCreateGame, MessageGameCreated } from '../../../types';
import store from '../../store';

export default Vue.extend({
  name: 'CreateGameForm',
  components: {
    GameForm,
  },
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
      loading: false,
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
      this.loading = true;
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
