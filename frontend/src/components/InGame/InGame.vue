<template>
  <div>
    <div v-if="error" class="mt-5">
      <b-alert show variant="danger">
        <h4 class="alert-heading">Oops. An error occurred!</h4>
        <p>Error: {{ error.message }}</p>
        <hr />
        <p class="mb-0">Please reload the page and try again.</p>
      </b-alert>
    </div>

    <GameCreated v-else-if="isStoreDefined && game && game.status === 'created'" />
    <GameRunning v-else-if="isStoreDefined && game && game.status === 'running'" />
    <GameEnded v-else-if="isStoreDefined && game && game.status === 'ended'" />

    <div v-else class="d-flex justify-content-center m-5">
      <b-spinner label="Loading..."></b-spinner>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import * as Sentry from '@sentry/vue';

import { Player, Game, Round, OtherPlayer, MessageRoundUpdated, GameState } from '@/types';
import store from '@/store';

import GameCreated from './GameCreated.vue';
import GameRunning from './GameRunning.vue';
import GameEnded from './GameEnded.vue';

export default Vue.extend({
  name: 'InGame',
  components: {
    GameCreated,
    GameRunning,
    GameEnded,
  },
  props: {
    token: {
      required: true,
      type: String,
    },
  },
  data() {
    return {
      error: undefined as { message: string } | undefined,
    };
  },
  computed: {
    game(): Game | undefined {
      return store.state.gameState?.game;
    },
    players(): OtherPlayer[] | undefined {
      return store.state.gameState?.players;
    },
    rounds(): Round[] | undefined {
      return store.state.gameState?.rounds;
    },
    player(): Player | undefined {
      return store.state.player;
    },
    socket(): Socket | undefined {
      return store.state.socket as Socket | undefined;
    },
    isStoreDefined(): boolean {
      return !!this.game && !!this.players && !!this.rounds && !!this.player && !!this.socket;
    },
  },
  mounted() {
    this.initSocket();
  },
  beforeDestroy() {
    this.closeSocket();
  },
  methods: {
    initSocket(): void {
      Vue.$log.debug('Initializing Socket');
      const baseURL = new URL(process.env.VUE_APP_BACKEND_URL || window.location.origin).toString();
      try {
        const socket = io(baseURL, { auth: { token: `Bearer ${this.token}` } });
        socket
          .on('gamestate_updated', (data: GameState) => {
            Vue.$log.debug('Socket event: gamestate_updated');
            store.commit.setGameState(data);
          })
          .on('player_updated', (data: Player) => {
            Vue.$log.debug('Socket event: player_updated');
            store.commit.setPlayer(data);
          })
          .on('round_updated', (data: MessageRoundUpdated) => {
            Vue.$log.debug('Socket event: round_updated');
            store.commit.setRoundAtIndex(data);
          })
          .on('connect_error', (data: { message: string }) => {
            Vue.$log.error('Socket connect error:', data);
            Sentry.captureException(data);
            this.error = data;
          })
          .on('exception', (data: { message: string }) => {
            Vue.$log.error('Socket exception:', data);
            Sentry.captureException(data);
            this.showErrorMessage(data.message);
          });
        store.commit.setSocket(socket);
      } catch (error) {
        this.error = error as Error;
      }
    },
    closeSocket(): void {
      if (!store.state.socket) return;
      Vue.$log.debug('Disconnecting Socket');
      store.state.socket.disconnect();
      store.commit.setSocket(undefined);
    },
    showErrorMessage(msg: string | undefined) {
      this.$bvToast.toast(msg || 'An unknown error occurred.', {
        title: 'Oops.',
        autoHideDelay: 5000,
        variant: 'danger',
        solid: true,
      });
    },
  },
});
</script>
