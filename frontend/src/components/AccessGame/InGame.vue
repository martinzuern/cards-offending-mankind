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
      error: {} as any,
    };
  },
  computed: {
    game(): Game {
      return this.$store.state.game;
    },
    player(): Player {
      return this.$store.state.player;
    },
    rounds(): Round[] {
      return this.$store.state.rounds;
    },
    socket(): any {
      return this.$store.state.socket;
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
    initSocket() {
      const baseURL = new URL(process.env.VUE_APP_BACKEND_URL || window.location.origin).toString();
      try {
        this.$store.commit('setSocket', io(baseURL, { autoConnect: false }));
        this.socket
          .on('gamestate_updated', (data: GameState) => {
            const { players, game, rounds } = data;
            this.$store.commit('setPlayers', players);
            this.$store.commit('setGame', game);
            this.$store.commit('setRounds', rounds);
            this.$store.commit('setRoundIndex', (rounds.length || 1) - 1);
          })
          .on('player_updated', (data: Player) => {
            this.$store.commit('setPlayer', data);
          })
          .on('round_updated', (data: MessageRoundUpdated) => {
            this.$store.commit('setRoundAtIndex', { round: data.round, index: data.roundIndex });
          })
          .on('error', (data) => {
            console.log(data);
          })
          .emit('authenticate', { token: this.token });
        this.socket.open();
      } catch (error) {
        this.error = error;
      }
    },
  },
});
</script>
