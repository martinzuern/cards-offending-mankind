<template>
  <div v-if="player && currentRound && player.id !== currentRound.judgeId && currentRound.status === 'created'">
    <template v-if="submitted">
      <h6 class="mt-5 text-center">Waiting for other players to submit ...</h6>
    </template>
    <template v-else>
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
    </template>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import { includes } from 'lodash';
import { Player, Round, ResponseCard, Game } from '../../../../types';
import store from '../../store';

export default Vue.extend({
  name: 'Deck',
  data() {
    return {
      selectedCards: [] as ResponseCard[],
      submitted: false,
    };
  },
  computed: {
    player(): Player | undefined {
      return store.state.player;
    },
    notSelectedCards(): ResponseCard[] {
      if (!store.state.player) return [];
      const selectedValues = this.selectedCards.map(({ value }) => value);
      return store.state.player.deck.filter(({ value }) => !includes(selectedValues, value));
    },
    game(): Game | undefined {
      return store.state.gameState?.game;
    },
    rounds(): Round[] | undefined {
      return store.state.gameState?.rounds;
    },
    currentRound(): Round | undefined {
      return store.getters.currentRound;
    },
    roundIndex(): number {
      return store.getters.currentRoundIndex;
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
      if (!store.state.socket || !this.rounds || !this.currentRound) return;

      const toPick = this.currentRound.prompt.pick;
      if (this.selectedCards.length !== toPick) {
        this.$bvToast.toast(`Please select exactly ${toPick === 1 ? '1 card' : `${toPick} cards`}.`, {
          title: 'Oops.',
          autoHideDelay: 5000,
          variant: 'danger',
        });
        return;
      }

      store.state.socket.emit('pick_cards', { roundIndex: this.rounds.length - 1, cards: this.selectedCards });
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
      } else if (this.selectedCards.length < (this.currentRound?.prompt?.pick || 0)) {
        this.selectedCards.push(card);
      } else {
        if (this.currentRound?.prompt?.pick === 1) {
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
</style>
