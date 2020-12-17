<template>
  <div>
    <template v-if="userLocked">
      <h2>📡 Connecting …</h2>
      <h6>Please be patient, this can take up to 40 seconds.</h6>
    </template>

    <template v-else-if="isStoreDefined && game.status === 'ended'">
      <GameEnded />
    </template>

    <template v-else-if="isStoreDefined && game.status === 'running'">
      <div>
        <GameStateView />
        <Deck />
      </div>
    </template>

    <template v-else>
      <div class="d-flex justify-content-center m-5">
        <b-spinner label="Loading..."></b-spinner>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
/* global SocketIOClient */

// @ is an alias to /src
import Vue from 'vue';
import io from 'socket.io-client';

import store from '../../store';
import { Player, Game, Round, OtherPlayer, MessageRoundUpdated, GameState } from '../../../types';

import GameEnded from './GameEnded.vue';
import GameStateView from './GameState.vue';
import Deck from './Deck.vue';

export default Vue.extend({
  name: 'InGame',
  components: {
    GameEnded,
    GameStateView,
    Deck,
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
      console.log({ socket: this.socket });
      console.log('Initializing Socket');
      const baseURL = new URL(process.env.VUE_APP_BACKEND_URL || window.location.origin).toString();
      try {
        const socket = io(baseURL, { autoConnect: false });
        socket
          .on('gamestate_updated', (data: GameState) => {
            store.commit.setGameState(data);
          })
          .on('player_updated', (data: Player) => {
            store.commit.setPlayer(data);
          })
          .on('round_updated', (data: MessageRoundUpdated) => {
            store.commit.setRoundAtIndex(data);
          })
          .on('error', (data: unknown) => {
            console.log(data);
          })
          .on('authenticated', () => {
            this.userLocked = false;
          })
          .on('unauthorized', (msg: { message: string }) => {
            console.error('unauthorized:', msg);
            if (msg.message === 'user-locked') {
              this.userLocked = true;
              setTimeout(() => this.initSocket(), 5000);
            }
            this.closeSocket();
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
      console.log('Disconnecting Socket');
      store.state.socket.disconnect();
      store.commit.setSocket(undefined);
    },
  },
});
</script>
