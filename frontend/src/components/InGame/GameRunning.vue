<template>
  <div>
    <b-row class="sticky-top py-2">
      <b-col cols="6" md="auto" order="1" class="pt-2">
        <h5>Round {{ rounds.length }}</h5>
      </b-col>
      <b-col order="3" order-md="2" class="py-2">
        <Countdown />
      </b-col>
      <b-col cols="6" md="auto" order="2" order-md="3" class="text-right">
        <b-button id="popover-leaderboard" variant="outline-secondary" class="d-flex align-items-center float-right">
          🏅
          <span class="d-none d-lg-block ml-1">Leaderboard</span>
        </b-button>
        <b-popover target="popover-leaderboard" triggers="click blur" placement="bottomleft">
          <template #title>Leaderboard</template>
          <Leaderboard />
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

    <Card class="mx-auto mt-5 prompt" :card="currentRound.prompt" />

    <transition name="fade">
      <GamePlaying v-if="currentRound.status === 'created'" />
      <GameJudging v-else />
    </transition>

    <div v-if="currentRound.status === 'ended'" class="overlay mt-5 sticky-bottom-sm">
      <button class="btn btn-success d-block d-block w-100" @click="clickNextRound">Next Round</button>
      <button v-if="isHost" class="btn btn-secondary d-block w-100 mt-2" @click="clickEndGame">End Game</button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import assert from 'assert';
import type { Socket } from 'socket.io-client';

import { OtherPlayer, Player, Game, Round } from '@/types';
import store from '@/store';
import SocketEmitter from '@/helpers/SocketEmitter';

import Countdown from './helper/Countdown.vue';
import Leaderboard from './helper/Leaderboard.vue';
import GamePlaying from './helper/GamePlaying.vue';
import GameJudging from './helper/GameJudging.vue';
import Card from './helper/Card.vue';

export default Vue.extend({
  name: 'GameRunning',
  components: {
    Countdown,
    Leaderboard,
    GamePlaying,
    GameJudging,
    Card,
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
    socket(): SocketEmitter {
      assert(store.state.socket);
      return new SocketEmitter(store.state.socket as Socket);
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
  mounted() {
    window.onbeforeunload = () => 'Do you really want to leave this game?';
  },
  beforeDestroy() {
    window.onbeforeunload = null;
  },
  methods: {
    clickNextRound(): void {
      this.socket.startNextRound();
    },
    clickEndGame(): void {
      this.socket.endGame();
    },
  },
});
</script>

<style lang="sass" scoped>
.sticky-top
  background: white

.prompt
  width: $card-width * 1.2
  height: $card-height * 1.2

.fade-leave-active
  transition: opacity .5s
.fade-enter-active
  transition: opacity .5s
  transition-delay: .51s
.fade-enter, .fade-leave-to
  opacity: 0
</style>
