<template>
  <div v-if="game || player">
    <template v-if="game.status === 'ended'">
      <div class="list-group">
        <div
          v-for="player in players"
          :key="player.id"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <strong>{{ player.nickname }}</strong>
          <span>{{ player.points }}</span>
        </div>
      </div>
    </template>
    <template v-else>
      <div v-if="game.status === 'created'" class="card">
        <div class="card-body">
          <h6>Invite other players to join</h6>
          <div class="badge badge-pill badge-secondary" :class="{ 'badge-success': player.isHost }">{{ game.id }}</div>
          <p v-if="players.length > 1" class="mt-3 mb-0">
            Other players in this game:
            <span
              v-for="(gamePlayer, index) in players"
              v-if="gamePlayer.nickname !== player.nickname"
              :key="gamePlayer.id"
              >{{ gamePlayer.nickname }} <template v-if="index < players.length - 1">, </template></span
            >
          </p>
        </div>
      </div>
      <button
        v-if="player.isHost && !rounds.length && players.length > 2"
        class="btn btn-success d-block w-100 mt-3"
        @click="startGame"
      >
        Start Game
      </button>
      <div v-if="game.status !== 'created'" class="text-center">
        <h5 class="mt-3">Round {{ roundIndex + 1 }}</h5>
        <template v-if="rounds.length && isJudge">
          <h2>
            👩🏻‍⚖️ Relax, you are judging this round.
          </h2>
          <h6 v-if="currentRound.status === 'played'">
            Okay, it's your turn. Judge!
          </h6>
        </template>
      </div>

      <div v-if="game.status === 'running'" class="play-card black-card mx-auto mt-5">
        {{ (currentRound.prompt || {}).value }}
      </div>

      <Submissions v-if="currentRound.submissions" />

      <div v-if="currentRound.status === 'ended'" class="overlay mt-5">
        <button class="btn btn-success d-block mb-3 d-block w-100" @click="clickNextRound">Next Round</button>
        <button class="btn btn-secondary d-block w-100 mt-3" @click="clickEndGame">End Game</button>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import Submissions from './Submissions.vue';
import { OtherPlayer, Player, Game, Round } from '../../../../types';
import store from '../../store';

export default Vue.extend({
  name: 'GameState',
  components: {
    Submissions,
  },
  computed: {
    isJudge(): boolean {
      return !!(this.player && this.currentRound && this.player.id === this.currentRound.judgeId);
    },
    game(): Game | undefined {
      return store.state.gameState?.game;
    },
    player(): Player | undefined {
      return store.state.player;
    },
    players(): OtherPlayer[] | undefined {
      return store.state.gameState?.players;
    },
    rounds(): Round[] | undefined {
      return store.state.gameState?.rounds;
    },
    currentRound(): Round | undefined {
      return store.getters.currentRound;
    },
    socket(): SocketIOClient.Socket | undefined {
      return store.state.socket;
    },
    roundIndex(): number {
      return store.getters.currentRoundIndex;
    },
  },
  methods: {
    startGame(): void {
      this.socket && this.socket.emit('start_game');
    },
    clickNextRound(): void {
      this.socket && this.socket.emit('start_next_round');
    },
    clickEndGame(): void {
      this.socket && this.socket.emit('end_game');
    },
  },
});
</script>

<style lang="sass"></style>
