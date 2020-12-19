<template>
  <div v-if="isJudge || submitted">
    <h6 class="mt-5 text-center">Waiting for other players to submit ...</h6>
  </div>
  <div v-else>
    <div class="mt-5 card-fan" :class="`fan-count-${player.deck.length}`">
      <template v-for="(cardList, index) in [selectedCards, notSelectedCards]">
        <div
          v-for="card in cardList"
          :key="card.value"
          class="play-card white-card"
          :class="index === 0 ? 'selected' : ''"
          @click="clickToggleCard(card)"
        >
          {{ card.value }}
        </div>
      </template>
    </div>

    <button class="btn btn-success w-100 d-block mt-5" @click="submitSelection">Submit Selection</button>
  </div>
</template>

<script lang="ts">
/* global SocketIOClient */

import Vue from 'vue';
import assert from 'assert';
import { includes } from 'lodash';

import { Player, Round, ResponseCard, Game } from '@/types';
import store from '@/store';

export default Vue.extend({
  name: 'GamePlaying',
  data() {
    return {
      selectedCards: [] as ResponseCard[],
      submitted: false,
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
    notSelectedCards(): ResponseCard[] {
      const selectedValues = this.selectedCards.map(({ value }) => value);
      return this.player.deck.filter(({ value }) => !includes(selectedValues, value));
    },
    isJudge(): boolean {
      return this.player.id === this.currentRound.judgeId;
    },
  },
  watch: {
    roundIndex(): void {
      this.selectedCards = [];
      this.submitted = false;
    },
  },
  methods: {
    submitSelection(): void {
      const toPick = this.currentRound.prompt.pick;
      if (this.selectedCards.length !== toPick) {
        this.$bvToast.toast(`Please select exactly ${toPick === 1 ? '1 card' : `${toPick} cards`}.`, {
          title: 'Oops.',
          autoHideDelay: 5000,
          variant: 'danger',
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
      } else if (this.selectedCards.length < this.currentRound.prompt.pick) {
        this.selectedCards.push(card);
      } else {
        if (this.currentRound.prompt.pick === 1) {
          this.selectedCards = [card];
        } else {
          this.$bvToast.toast('Too many cards selected, please deselect first.', {
            title: 'Oops.',
            autoHideDelay: 5000,
            variant: 'danger',
          });
        }
      }
    },
  },
});
</script>

<style lang="sass">
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

    .white-card
      height: 12rem
      width: 8rem
      position: relative
      top: 30px
      transition: transform .2s
      margin-left: -2rem
      font-size: #{"min(1rem, 1vw)"}

    @for $cardCount from 2 through 25
      &.fan-count-#{$cardCount}
        .white-card
          @include card-angles($cardCount)

@include media-breakpoint-down(sm)
  .card-fan
    display: flex
    flex-flow: wrap
    justify-content: center
    padding-bottom: 3rem

    .white-card
      margin-bottom: -3rem
      font-size: 3vw

      &.selected
        order: 99
</style>
