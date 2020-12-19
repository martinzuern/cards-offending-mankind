<template>
  <div class="my-5">
    <div
      v-for="(submission, submissionIndex) in currentRound.submissions"
      :key="submissionIndex"
      class="submission my-5 py-2"
      :class="{ canChooseWinner: canChooseWinner }"
    >
      <h6 v-if="currentRound.status === 'ended'">
        Submission by
        <b-badge pill variant="dark">{{ getPlayerForSubmission(submission).nickname || '***' }}</b-badge>
      </h6>
      <b-row>
        <b-col v-for="(card, index) in submission.cards" :key="index" md="auto">
          <div
            class="flip-card"
            :class="{ revealed: submission.isRevealed }"
            @click="selectSubmittedCard(submissionIndex)"
          >
            <div class="flip-card-inner">
              <div class="flip-card-front play-card white-card">Cards<br />Offending<br />Mankind</div>
              <div
                class="flip-card-back play-card white-card"
                :class="{ selected: submissionIndex === winnerSubmissionIndex || submission.pointsChange > 0 }"
              >
                {{ card.value }}
              </div>
            </div>
          </div>
        </b-col>
      </b-row>
    </div>
    <button
      v-if="canChooseWinner"
      class="w-100 d-block mt-3 btn btn-success"
      :disabled="winnerSubmissionIndex < 0"
      @click="chooseWinner()"
    >
      Choose winner 🎉
    </button>
  </div>
</template>

<script lang="ts">
/* global SocketIOClient */

import Vue from 'vue';
import assert from 'assert';

import { OtherPlayer, Player, Game, Round, RoundSubmission } from '@/types';
import store from '@/store';

export default Vue.extend({
  name: 'GameJudging',
  data() {
    return { winnerSubmissionIndex: -1 };
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
    roundIndex(): number {
      return store.getters.currentRoundIndex;
    },
    myPoints(): number {
      return this.player.points;
    },
    isJudge(): boolean {
      return this.player.id === this.currentRound.judgeId;
    },
    canChooseWinner(): boolean {
      return this.isJudge && this.currentRound.status === 'revealed';
    },
  },
  watch: {
    myPoints: function (newPoints, oldPoints) {
      const gain = newPoints - oldPoints;
      if (gain <= 0) return;
      this.$bvToast.toast(`You won ${gain} ${gain > 1 ? 'points' : 'point'}.`, {
        title: 'Hurray 🎉',
        autoHideDelay: 10000,
        variant: 'success',
      });
    },
  },
  methods: {
    getPlayerForSubmission(submission: RoundSubmission): OtherPlayer | Record<string, never> {
      return this.players.find(({ id }) => id === submission.playerId) || {};
    },
    chooseWinner(): void {
      if (!this.isJudge) return;
      this.socket.emit('choose_winner', {
        submissionIndex: this.winnerSubmissionIndex,
        roundIndex: this.roundIndex,
      });
      this.winnerSubmissionIndex = -1;
    },
    selectSubmittedCard(submissionIndex: number): void {
      if (!this.isJudge) return;
      if (this.currentRound.status === 'revealed') {
        this.winnerSubmissionIndex = submissionIndex;
      } else {
        this.socket.emit('reveal_submission', {
          submissionIndex,
          roundIndex: this.roundIndex,
        });
      }
    },
  },
});
</script>

<style lang="sass">
.flip-card
  background-color: transparent
  width: $card-width
  height: $card-height
  perspective: 1000px

  .flip-card-inner
    position: relative
    width: 100%
    height: 100%
    transition: transform 0.6s
    transform-style: preserve-3d

  &.revealed
    .flip-card-inner
      transform: rotateY(180deg)

  .flip-card-front, .flip-card-back
    position: absolute
    width: 100%
    height: 100%
    margin: 0 !important
    backface-visibility: hidden

  .flip-card-front
    display: flex
    align-items: flex-end
    font-weight: 800

  .flip-card-back
    transform: rotateY(180deg)

.submission
  &.canChooseWinner:hover
    .flip-card-back
        background-color: #6495ED
        color: white
</style>
