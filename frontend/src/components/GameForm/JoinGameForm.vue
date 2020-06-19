<template>
  <GameForm>
    <template v-if="!game">
      Loading ...
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
      errors: [] as unknown[],
    };
  },
  computed: {},
  mounted() {
    this.fetchGame();
  },
  methods: {
    async fetchGame(): Promise<void> {
      const response = await axios.get<MessageGetGame>(`/games/${this.gameId}`);
      this.game = response.data.game;
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
