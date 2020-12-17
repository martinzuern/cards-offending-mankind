<template>
  <div
    v-if="player && currentRound && (currentRound.submissions || []).length && currentRound.status !== 'created'"
    class="my-5"
  >
    <h5>Submissions</h5>
    <div v-for="(submission, submissionIndex) in currentRound.submissions" :key="submission.timestamp" class="mb-4">
      <h6>
        Submission by {{ ((players || []).find(({ id }) => id === submission.playerId) || {}).nickname || '***' }}
      </h6>
      <div v-for="(card, index) in submission.cards" :key="index">
        <div class="play-card white-card pt-5" @click="revealSubmissionForCard(submissionIndex)">{{ card.value }}</div>
      </div>
      <button v-if="canChooseWinner" class="w-100 d-block mt-3 btn btn-success" @click="chooseWinner(submissionIndex)">
        Winner 🎉
      </button>
      <div
        v-if="player && submission.playerId === player.id && submission.pointsChange"
        class="alert alert-success mt-5"
      >
        🎉 You won!
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/* global SocketIOClient */

import Vue from 'vue';

import { OtherPlayer, Player, Game, Round } from '@/types';
import store from '@/store';

export default Vue.extend({
  name: 'Submissions',
  computed: {
    isJudge(): boolean {
      return !!(this.player && this.currentRound && this.player.id === this.currentRound.judgeId);
    },
    canChooseWinner(): boolean {
      return this.isJudge && this.currentRound?.status === 'revealed';
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
    chooseWinner(submissionIndex: number): void {
      this.socket &&
        this.socket.emit('choose_winner', {
          submissionIndex,
          roundIndex: this.roundIndex,
        });
    },
    revealSubmissionForCard(submissionIndex: number): void {
      if (this.isJudge && this.socket) {
        this.socket.emit('reveal_submission', {
          submissionIndex,
          roundIndex: this.roundIndex,
        });
      }
    },
  },
});
</script>

<style lang="sass"></style>
