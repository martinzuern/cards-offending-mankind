<template>
  <div>
    <template v-if="userLocked">
      <h2>It appears that you or your browser triggered a reload. 🤦‍♀️</h2>
      <h6>Please be patient, this can take up to 35 seconds.</h6>
    </template>

    <template v-else>
      <div class="player-information">
        <GameStateView />
        <Deck />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import io from 'socket.io-client';
import GameStateView from '@/components/AccessGame/GameState.vue';
import Deck from '@/components/AccessGame/Deck.vue';
import { Player, Game, Round, MessageRoundUpdated, GameState } from '../../../types';
import store from '../../store';

export default Vue.extend({
  name: 'InGame',
  components: {
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
    player(): Player | undefined {
      return store.state.player;
    },
    rounds(): Round[] | undefined {
      return store.state.gameState?.rounds;
    },
    socket(): SocketIOClient.Socket | undefined {
      return store.state.socket;
    },
  },
  mounted() {
    this.initSocket();
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
            socket.close();
            store.commit.setSocket(undefined);
          })
          .emit('authenticate', { token: this.token });
        socket.open();
        store.commit.setSocket(socket);
      } catch (error) {
        this.error = error;
      }
    },
  },
});
</script>
