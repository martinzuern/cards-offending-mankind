<template>
  <div class="my-5">
    <div class="d-flex justify-content-center flex-wrap">
      <div
        v-for="(submission, submissionIndex) in currentRound.submissions"
        :key="submissionIndex"
        class="submission m-4"
        :class="{ canChooseWinner, isJudge }"
      >
        <b-badge v-if="currentRound.status === 'ended'" class="mx-0" pill variant="dark">
          {{ getPlayerForSubmission(submission).nickname }}
        </b-badge>
        <b-row class="px-2">
          <b-col v-for="(card, index) in submission.cards" :key="index" cols="auto" class="p-1">
            <div
              class="flip-card"
              :class="{ revealed: submission.isRevealed }"
              @click="selectSubmittedCard(submissionIndex)"
            >
              <div class="flip-card-inner">
                <Card class="flip-card-front" :turned-backside="true" />
                <Card
                  class="flip-card-back"
                  :class="{ selected: submissionIndex === winnerSubmissionIndex || submission.pointsChange > 0 }"
                  :value="card.value"
                />
              </div>
            </div>
          </b-col>
        </b-row>
      </div>
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
import Card from './Card.vue';

export default Vue.extend({
  name: 'GameJudging',
  components: {
    Card,
  },
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
        const sub = this.currentRound.submissions[submissionIndex];
        if (!sub || sub.isRevealed) return;
        this.socket.emit('reveal_submission', {
          submissionIndex,
          roundIndex: this.roundIndex,
        });
      }
    },
  },
});
</script>

<style lang="sass" scoped>
.submission
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
      transition-delay: 2s
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
      cursor: not-allowed

    .flip-card-front
      display: flex
      align-items: flex-end
      font-weight: 800

    .flip-card-back
      transform: rotateY(180deg)

  &.isJudge
    .flip-card
      .flip-card-inner
        transition-delay: 0s
        .flip-card-front
          cursor: pointer
  &.canChooseWinner:hover
    .flip-card-back
        cursor: pointer
</style>
