<template>
  <div>
    <b-row>
      <b-col cols="6" md="auto" order="1" class="pt-2">
        <h5>Round {{ rounds.length }}</h5>
      </b-col>
      <b-col order="3" order-md="2" class="py-2">
        <Countdown />
      </b-col>
      <b-col cols="6" md="auto" order="2" order-md="3" class="text-right">
        <b-button id="popover-leaderboard" variant="outline-secondary">🏅</b-button>
        <b-popover target="popover-leaderboard" triggers="click blur" placement="bottomleft">
          <template #title>Leaderboard</template>
          <div class="list-group leaderboard-list-group">
            <div
              v-for="p in players"
              :key="p.id"
              class="list-group-item d-flex justify-content-between align-items-center"
            >
              <strong>{{ p.nickname }}</strong>
              <span>{{ p.points }}</span>
            </div>
          </div>
        </b-popover>
      </b-col>
    </b-row>

    <b-row class="text-center">
      <b-col v-if="isJudge">
        <strong>👩🏻‍⚖️ You are judging this round.</strong>
      </b-col>
      <b-col v-else>
        👩🏻‍⚖️ <b-badge pill variant="dark">{{ judgePlayer.nickname }}</b-badge> is judging this round.
      </b-col>
    </b-row>

    <div class="play-card black-card mx-auto mt-5">
      {{ currentRound.prompt.value }}
    </div>

    <template v-if="currentRound.status === 'created'">
      <GamePlaying />
    </template>
    <template v-else>
      <GameJudging />
    </template>

    <div v-if="currentRound.status === 'ended'" class="overlay mt-5">
      <button class="btn btn-success d-block mb-3 d-block w-100" @click="clickNextRound">Next Round</button>
      <button v-if="isHost" class="btn btn-secondary d-block w-100 mt-3" @click="clickEndGame">End Game</button>
    </div>
  </div>
</template>

<script lang="ts">
/* global SocketIOClient */

import Vue from 'vue';
import assert from 'assert';

import { OtherPlayer, Player, Game, Round } from '@/types';
import store from '@/store';

import Countdown from './helper/Countdown.vue';
import GamePlaying from './helper/GamePlaying.vue';
import GameJudging from './helper/GameJudging.vue';

export default Vue.extend({
  name: 'GameRunning',
  components: {
    Countdown,
    GamePlaying,
    GameJudging,
  },
  computed: {
    game(): Game {
      assert(store.state.gameState?.game);
      return store.state.gameState.game;
    },
    player(): Player {
      assert(store.state.player);
      return store.state.player;
    },
    players(): OtherPlayer[] {
      assert(store.state.gameState?.players);
      return store.state.gameState.players;
    },
    currentRound(): Round {
      assert(store.getters.currentRound);
      return store.getters.currentRound;
    },
    socket(): SocketIOClient.Socket {
      assert(store.state.socket);
      return store.state.socket;
    },
    rounds(): Round[] {
      assert(store.state.gameState?.rounds);
      return store.state.gameState.rounds;
    },
    isJudge(): boolean {
      return this.player.id === this.currentRound.judgeId;
    },
    judgePlayer(): OtherPlayer {
      const j = this.players.find((p) => p.id === this.currentRound.judgeId);
      assert(j);
      return j;
    },
    isHost(): boolean {
      return this.player.isHost;
    },
  },
  methods: {
    startGame(): void {
      this.socket.emit('start_game');
    },
    clickNextRound(): void {
      this.socket.emit('start_next_round');
    },
    clickEndGame(): void {
      this.socket.emit('end_game');
    },
  },
});
</script>

<style lang="sass">
.leaderboard-list-group
  min-width: 14rem
</style>
