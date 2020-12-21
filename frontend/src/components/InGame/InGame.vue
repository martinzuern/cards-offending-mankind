<template>
  <div>
    <template v-if="userLocked">
      <h2>📡 Connecting …</h2>
      <h6>Please be patient, this can take a couple of seconds.</h6>
    </template>

    <GameCreated v-else-if="isStoreDefined && game && game.status === 'created'" />
    <GameRunning v-else-if="isStoreDefined && game && game.status === 'running'" />
    <GameEnded v-else-if="isStoreDefined && game && game.status === 'ended'" />

    <div v-else class="d-flex justify-content-center m-5">
      <b-spinner label="Loading..."></b-spinner>
    </div>
  </div>
</template>

<script lang="ts">
/* global SocketIOClient */

import Vue from 'vue';
import io from 'socket.io-client';

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
      error: {} as unknown,
      userLocked: false,
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
    socket(): SocketIOClient.Socket | undefined {
      return store.state.socket;
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
        const socket = io(baseURL, { autoConnect: false });
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
          .on('error', (data: { message: string }) => {
            Vue.$log.error('Socket error:', data);
            this.showErrorMessage(data.message || 'An unknown error occurred.');
          })
          .on('authenticated', () => {
            Vue.$log.debug('Socket event: authenticated');
            this.userLocked = false;
          })
          .on('unauthorized', (data: { message: string }) => {
            Vue.$log.error('Socket unauthorized:', data);
            if (data.message === 'user-locked') {
              this.userLocked = true;
              setTimeout(() => this.initSocket(), 5000);
            } else {
              this.showErrorMessage(data.message || 'An unknown error occurred.');
            }
            this.closeSocket();
          })
          .on('disconnect', () => {
            Vue.$log.debug('Socket disconnected');
            !this.userLocked && this.showErrorMessage('Connection to server lost.');
            this.userLocked = true;
          })
          .on('reconnect', () => {
            Vue.$log.debug('Socket reconnected');
            socket.emit('authenticate', { token: this.token });
          })
          .emit('authenticate', { token: this.token });
        socket.open();
        store.commit.setSocket(socket);
      } catch (error) {
        this.error = error;
      }
    },
    closeSocket(): void {
      if (!store.state.socket) return;
      Vue.$log.debug('Disconnecting Socket');
      store.state.socket.disconnect();
      store.commit.setSocket(undefined);
    },
    showErrorMessage(msg: string) {
      this.$bvToast.toast(msg, {
        title: 'Oops.',
        autoHideDelay: 5000,
        variant: 'danger',
      });
    },
  },
});
</script>
