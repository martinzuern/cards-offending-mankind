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
        <Multiselect
          v-model="game.packs"
          :options="officialPacks"
          :multiple="true"
          :close-on-select="false"
          :clear-on-select="false"
          placeholder="Select a pack"
          label="name"
          track-by="name"
        >
          <template slot="option" slot-scope="props">
            {{ props.option.name }}
            <small class="mt-1">
              {{ props.option.promptsCount }} prompts / {{ props.option.responsesCount }} responses
            </small>
          </template>
        </Multiselect>
        <b-form-group label="Password (optional)" label-for="password" class="mt-2">
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
import Multiselect from 'vue-multiselect';

import 'vue-multiselect/dist/vue-multiselect.min.css';

import GameForm from './GameForm.vue';
import { CreateGame, CreatePlayer, PackInformation, MessageCreateGame } from '../../../types';
import store from '../../store';

export default Vue.extend({
  name: 'CreateGameForm',
  components: {
    GameForm,
    Multiselect,
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
        .then(() => {
          const gameId = store.state.gameState?.game?.id;
          if (gameId) this.$router.push({ name: 'Game', params: { gameId } });
        })
        .catch((err: Error) => {
          console.error(err);
          this.errors.push(err);
        });
    },
  },
});
</script>
