<template>
  <GameForm>
    <template v-if="errors.length > 0">
      <b-alert v-for="err in errors" :key="err.title" class="my-3" variant="danger" show> {{ err }} </b-alert>
    </template>

    <template v-else-if="!game">
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

        <b-form-group v-if="game.hasPassword" label="Password" label-for="password">
          <b-form-input id="password" v-model="password" type="password" required autocomplete="off"></b-form-input>
        </b-form-group>

        <b-button type="submit" variant="secondary" size="sm" class="mt-3">
          Join game
        </b-button>
      </b-form>
    </template>
  </GameForm>
</template>

<script lang="ts">
import Vue from 'vue';

import GameForm from './GameForm.vue';
import { Game, CreatePlayer, MessageGetGame, MessageJoinGame, UUID } from '../../../types';
import axios from '../../helpers/api';
import store from '../../store';

export default Vue.extend({
  name: 'JoinGameForm',
  components: {
    GameForm,
  },
  props: {
    gameId: {
      type: String,
      required: false,
      default: '',
    },
  },
  data() {
    return {
      game: undefined as Game | undefined,
      password: '',
      player: {
        nickname: '',
      } as CreatePlayer,
      errors: [] as string[],
    };
  },
  computed: {},
  mounted() {
    this.fetchGame();
  },
  methods: {
    async fetchGame(): Promise<void> {
      try {
        const response = await axios.get<MessageGetGame>(`/games/${this.gameId}`);
        if (response.data.game.status !== 'created')
          this.errors.push('You cannot join this game as it has already started.');
        this.game = response.data.game;
      } catch (err) {
        if ([404, 400].includes(err?.response?.status)) this.errors.push('Game not found');
        else this.errors.push(err.toString());
      }
    },
    onSubmit(): void {
      const { player, password } = this;
      const data: MessageJoinGame = { ...player, password: password || undefined };
      store.dispatch
        .joinGame({
          id: this.gameId as UUID,
          data,
        })
        .then(() => {
          // reload
          this.$router.go(0);
        })
        .catch((err: Error) => {
          console.error(err);
          this.errors.push(err);
        });
    },
  },
});
</script>
