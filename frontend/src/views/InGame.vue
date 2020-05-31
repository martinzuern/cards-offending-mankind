<template>
  <div>
    <div class="player-information">
      <GameState />
      <Deck />
    </div>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import io from 'socket.io-client';
import GameState from '@/components/InGame/GameState.vue';
import Deck from '@/components/InGame/Deck.vue';
import { Player, Game, Round } from '../../../types';

export default Vue.extend({
  name: 'InGame',
  components: {
    GameState,
    Deck,
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
    const baseURL = new URL(process.env.VUE_APP_BACKEND_URL || window.location.origin).toString();
    const tokenData = JSON.parse(localStorage.token);
    const token = tokenData[this.$route.params.gameId];
    if (token) {
      try {
        this.$store.commit('setSocket', io(baseURL, { autoConnect: false }));
        this.socket
          // .on('connect', () => {})
          // .on('authenticated', () => {})
          .on('gamestate_updated', (data: any) => {
            const { players, game, rounds } = data;
            this.$store.commit('setPlayers', players);
            this.$store.commit('setGame', game);
            this.$store.commit('setRounds', rounds);
            this.$store.commit('setRoundIndex', (rounds.length || 1) - 1);
          })
          // .on('start_game', (data: any) => {})
          .on('player_updated', (data) => {
            this.$store.commit('setPlayer', data);
          })
          .on('round_updated', (data) => {
            this.$store.commit('setRoundAtIndex', { round: data.round, index: data.roundIndex });
          })
          .emit('authenticate', { token });
        this.socket.open();
      } catch (error) {
        this.error = error;
      }
    }
  },
  methods: {},
});
</script>
