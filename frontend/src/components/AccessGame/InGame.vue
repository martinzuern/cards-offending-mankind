<template>
  <div>
    <div class="player-information">
      <GameStateView />
      <Deck />
    </div>
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
    if (this.token) {
      console.log({ socket: this.socket });
      console.log('Initializing Socket');
      this.initSocket();
    }
  },
  methods: {
    initSocket(): void {
      const baseURL = new URL(process.env.VUE_APP_BACKEND_URL || window.location.origin).toString();
      try {
        const socket = io(baseURL, { autoConnect: false });
        socket
          .on('gamestate_updated', (data: GameState) => {
            store.commit.SET_GAME_STATE(data);
          })
          .on('player_updated', (data: Player) => {
            store.commit.SET_PLAYER(data);
          })
          .on('round_updated', (data: MessageRoundUpdated) => {
            store.commit.SET_ROUND_AT_INDEX(data);
          })
          .on('error', (data: unknown) => {
            console.log(data);
          })
          .emit('authenticate', { token: this.token });
        socket.open();
        store.commit.SET_SOCKET(socket);
      } catch (error) {
        this.error = error;
      }
    },
  },
});
</script>
