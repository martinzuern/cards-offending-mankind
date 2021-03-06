<template>
  <GameForm>
    <template v-if="errors.length > 0">
      <b-alert v-for="err in errors" :key="err" class="my-3" variant="danger" show> {{ err }} </b-alert>
    </template>

    <template v-else-if="!game">
      <div class="text-center my-3">
        <b-spinner label="Loading ..."></b-spinner>
      </div>
    </template>

    <template v-else>
      <template v-if="alerts.length > 0">
        <b-alert v-for="alert in alerts" :key="alert" class="my-3" variant="warning" show dismissible>
          <b-icon icon="info-circle" class="mr-1" />
          {{ alert }}
        </b-alert>
      </template>

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

        <b-button type="submit" variant="secondary" size="sm" class="mt-3"> Join game </b-button>
      </b-form>
    </template>
  </GameForm>
</template>

<script lang="ts">
import Vue from 'vue';

import GameForm from './GameForm.vue';
import { Game, CreatePlayer, MessageGetGame, MessageJoinGame, UUID } from '@/types';
import axios from '@/helpers/api';
import store from '@/store';

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
      alerts: [] as string[],
    };
  },
  computed: {},
  watch: {
    'player.nickname': function (nickname: string) {
      localStorage.nickname = nickname;
    },
  },
  mounted() {
    this.fetchGame();
    if (localStorage.nickname) {
      this.player.nickname = localStorage.nickname;
    }
  },
  methods: {
    async fetchGame(): Promise<void> {
      try {
        const response = await axios.get<MessageGetGame>(`/games/${this.gameId}`);
        if (response.data.game.status === 'running') this.alerts.push('This game has already started.');
        if (response.data.game.status === 'ended')
          this.errors.push('You cannot join this game as it has already ended.');
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
        .catch((err) => {
          if (err.response?.data?.errors)
            err.response.data.errors.map(({ message }: { message: string }) => this.alerts.push(message));
          else this.errors.push(err.toString());
        });
    },
  },
});
</script>
