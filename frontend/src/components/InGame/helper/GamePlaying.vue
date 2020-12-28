<template>
  <div v-if="isJudge || hasSubmitted" class="waiting-for-submission">
    <h6 class="mt-5 text-center">Waiting for other players to submit ...</h6>
    <div class="d-flex flex-nowrap justify-content-center pb-4 submission-wrap">
      <Card
        v-for="i in playerCount - 1"
        :key="i"
        class="submission-card"
        :class="{ visible: !!submissions[i - 1] }"
        :turned-backside="true"
        :style="{ '--randVal': getRandomDegrees(i), 'z-index': i }"
      />
    </div>
  </div>
  <div v-else>
    <div class="my-5 d-flex justify-content-center flex-wrap">
      <div v-if="selectedCards.length === 0" class="my-5">Please select {{ cardsToPickString }}.</div>
      <Card
        v-for="card in selectedCards"
        v-else
        :key="card.value"
        class="selected-card"
        :selected="true"
        :value="card.value"
        @click="clickToggleCard(card)"
      />
    </div>

    <div ref="cardFan" class="card-fan" :class="`fan-count-${notSelectedCards.length}`">
      <Card
        v-for="card in notSelectedCards"
        :key="card.value"
        class="in-fan-card"
        :value="card.value"
        @click="clickToggleCard(card)"
      />
    </div>

    <button
      class="btn btn-success w-100 d-block mt-5 submit-cards"
      :disabled="selectedCards.length === 0"
      @click="submitSelection"
    >
      Submit Selection
    </button>
  </div>
</template>

<script lang="ts">
/* global SocketIOClient */

import Vue from 'vue';
import assert from 'assert';
import { includes, random } from 'lodash';
import pluralize from 'pluralize';

import { Player, Round, ResponseCard, Game, RoundSubmission } from '@/types';
import store from '@/store';

import Card from './Card.vue';

export default Vue.extend({
  name: 'GamePlaying',
  components: {
    Card,
  },
  data() {
    return {
      selectedCards: [] as ResponseCard[],
      submitted: false,
      randomDegrees: {} as Record<number, number>,
    };
  },
  computed: {
    player(): Player {
      assert(store.state.player);
      return store.state.player;
    },
    game(): Game {
      assert(store.state.gameState?.game);
      return store.state.gameState.game;
    },
    playerCount(): number {
      assert(store.state.gameState?.players);
      return store.state.gameState.players.filter((p) => p.isActive && p.id !== this.currentRound.judgeId).length;
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
    submissions(): RoundSubmission[] {
      return this.currentRound.submissions;
    },
    hasSubmitted(): boolean {
      return this.submitted || this.submissions.some((s) => s.playerId === this.player.id);
    },
    notSelectedCards(): ResponseCard[] {
      const selectedValues = this.selectedCards.map(({ value }) => value);
      return this.player.deck.filter(({ value }) => !includes(selectedValues, value));
    },
    isJudge(): boolean {
      return this.player.id === this.currentRound.judgeId;
    },
    cardsToPick(): number {
      return this.currentRound.prompt.pick;
    },
    cardsToPickString(): string {
      return pluralize('card', this.cardsToPick, true);
    },
  },
  watch: {
    roundIndex(): void {
      this.selectedCards = [];
      this.submitted = false;
      this.randomDegrees = {};
    },
  },
  methods: {
    getRandomDegrees(idx: number): number {
      this.randomDegrees[idx] = this.randomDegrees[idx] ?? random(0, 359);
      return this.randomDegrees[idx];
    },
    submitSelection(): void {
      if (this.selectedCards.length !== this.cardsToPick) {
        this.$bvToast.toast(`Please select exactly ${this.cardsToPickString}.`, {
          title: 'Oops.',
          autoHideDelay: 5000,
          variant: 'danger',
          solid: true,
        });
        return;
      }

      this.socket.emit('pick_cards', { roundIndex: this.roundIndex, cards: this.selectedCards });
      this.submitted = true;
    },
    clickToggleCard(card: ResponseCard): void {
      if (this.submitted === true) return;

      const alreadySelected = this.selectedCards.find(({ value }) => value === card.value);
      if (alreadySelected) {
        this.selectedCards.splice(
          this.selectedCards.findIndex(({ value }) => value === card.value),
          1
        );
      } else if (this.selectedCards.length < this.cardsToPick) {
        this.selectedCards.push(card);
      } else {
        if (this.cardsToPick === 1) {
          this.selectedCards = [card];
        } else {
          this.$bvToast.toast('Too many cards selected, please deselect first.', {
            title: 'Oops.',
            autoHideDelay: 5000,
            variant: 'danger',
            solid: true,
          });
        }
      }
    },
  },
});
</script>

<style lang="sass" scoped>
@import "~bootstrap/scss/functions"
@import "~bootstrap/scss/variables"
@import "~bootstrap/scss/mixins"

@function pow($base, $exponent)
  $result: 1
  @for $_ from 1 through $exponent
    $result: $result * $base
  @return $result

@mixin card-angles($card-count)
  @for $i from 1 through $card-count
    $rotAngle: -40 + (70 / $card-count) * $i
    $topAdjust: 2.5 * pow((($i/($card-count + 1)) - 0.5 ) * 4, 2)

    &:nth-child(#{$i})
      transform: translateY(0px) rotate(#{$rotAngle}deg)
      margin-top: #{$topAdjust}rem

    &:nth-child(#{$i}):hover
      transform: translateY(-2rem) translateX(-1rem) rotate(#{$rotAngle}deg)

@include media-breakpoint-up(md)
  .card-fan
    display: flex
    position: relative
    margin-left: 2rem
    justify-content: space-evenly

    .in-fan-card
      position: relative
      top: 30px
      transition: transform .2s
      margin-left: -2rem

    @for $cardCount from 2 through 25
      &.fan-count-#{$cardCount}
        .in-fan-card
          @include card-angles($cardCount)

@include media-breakpoint-down(sm)
  .card-fan
    display: flex
    flex-flow: wrap
    justify-content: center
    padding-bottom: 3rem

    .in-fan-card
      margin-bottom: -3rem

  .submit-cards
    position: sticky
    bottom: 10px

@keyframes randomMoveIn
  from
    transform: translate(-100vw, -100vh) scale(3) rotate(calc(var(--randVal, 0) * 1deg))
    opacity: 0
  to
    transform: translate(0px, 0px) scale(1) rotate(calc(var(--randVal, 0) * 1deg))
    opacity: 1

.submission-wrap
  .submission-card
    font-weight: 800
    display: flex
    align-items: flex-end
    visibility: hidden
    margin-top: calc(var(--randVal, 0) * 0.25px)
    opacity: 0
    flex-shrink: 1
    cursor: auto
    &.visible
      visibility: visible
      animation: 1s randomMoveIn ease-out
      animation-delay: calc(var(--randVal, 0) * 4ms)
      animation-fill-mode: forwards

@include media-breakpoint-down(sm)
  .waiting-for-submission
    overflow-x: hidden
    margin: 0 -1rem

  .submission-wrap
    .submission-card
      margin-right: -1.5rem
      margin-left: -1.5rem
</style>
