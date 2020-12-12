<template>
  <div
    v-if="player && currentRound && player.id !== currentRound.judgeId && currentRound.status === 'created'"
    class="deck my-5"
  >
    <h6 class="text-center">Your Cards</h6>
    <div class="card-grid">
      <div
        v-for="card in player.deck"
        :key="card.value"
        :class="{ selected: selectedCards.find(({ value }) => value === card.value) }"
        class="play-card white-card pt-5 pr-2 mx-auto"
        @click="clickToggleCard(card)"
      >
        {{ card.value }}
      </div>
    </div>
    <button
      v-if="currentRound.status === 'created' && !submitted"
      class="btn btn-success w-100 d-block mt-5"
      @click="submitSelection"
    >
      Submit Selection
    </button>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
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
      if (!store.state.socket || !this.rounds) return;

      const toPick = this.currentRound.prompt.pick;
      if (this.selectedCards.length !== toPick) {
        const toPickStr = toPick === 1 ? '1 card' : `${toPick} cards`;
        this.$bvToast.toast(`Please select exactly ${toPickStr}.`, {
          title: 'Oops.',
          autoHideDelay: 5000,
          variant: 'danger',
          appendToast: false,
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
      } else if (this.selectedCards.length < this.currentRound.prompt.pick) {
        this.selectedCards.push(card);
      } else {
        this.$bvToast.toast(`Too many cards selected, please deselect first.`, {
          title: 'Oops.',
          autoHideDelay: 5000,
          variant: 'danger',
          appendToast: false,
        });
      }
    },
  },
});
</script>

<style lang="sass">
.card-grid
  display: grid
  align-items: end
  grid-template-columns: repeat(2, 1fr)
  .play-card
    align-items: end
</style>
