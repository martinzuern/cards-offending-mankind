<template>
  <div
    v-if="(currentRound.submissions || []).length && ['played', 'revealed', 'ended'].includes(currentRound.status)"
    class="my-5"
  >
    <h5>Submissions</h5>
    <div v-for="(submission, submissionIndex) in currentRound.submissions" :key="submission.timestamp" class="mb-4">
      <h6>Submission by {{ (players.find(({ id }) => id === submission.playerId) || {}).nickname || '***' }}</h6>
      <div v-for="(card, index) in submission.cards" :key="index">
        <div class="play-card white-card pt-5" @click="revealSubmissionForCard(submissionIndex)">{{ card.value }}</div>
      </div>
      <button
        v-if="isJudge && submission.isRevealed"
        class="w-100 d-block mt-3 btn btn-success"
        @click="chooseWinner(submissionIndex)"
      >
        Winner 🎉
      </button>
      <div v-if="submission.playerId === player.id && submission.pointsChange" class="alert alert-success mt-5">
        🎉 You won!
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import { Player, Game, Round } from '../../../../types';

export default Vue.extend({
  name: 'Submissions',
  computed: {
    isJudge(): boolean {
      return this.player.id === this.currentRound.judgeId;
    },
    game(): Game {
      return this.$store.state.game;
    },
    player(): Player {
      return this.$store.state.player;
    },
    players(): Player[] {
      return this.$store.state.players;
    },
    rounds(): Round[] {
      return this.$store.state.rounds;
    },
    currentRound(): Round {
      return this.$store.getters.currentRound;
    },
    socket(): any {
      return this.$store.state.socket;
    },
    roundIndex(): number {
      return this.$store.state.roundIndex;
    },
  },
  methods: {
    chooseWinner(index: number) {
      this.socket.emit('choose_winner', {
        submissionIndex: index,
        roundIndex: this.roundIndex,
      });
    },
    revealSubmissionForCard(index: number) {
      if (this.isJudge) {
        this.socket.emit('reveal_submission', {
          submissionIndex: index,
          roundIndex: this.roundIndex,
        });
      }
    },
  },
});
</script>

<style lang="sass"></style>
