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
      v-if="currentRound.status === 'created'"
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
  },
  watch: {
    roundIndex(): void {
      this.selectedCards.length = 0;
    },
  },
  methods: {
    submitSelection(): void {
      store.state.socket &&
        this.rounds &&
        store.state.socket.emit('pick_cards', { roundIndex: this.rounds.length - 1, cards: this.selectedCards });
    },
    clickToggleCard(card: ResponseCard): void {
      if (!this.selectedCards.find(({ value }) => value === card.value)) {
        this.selectedCards.push(card);
      } else {
        this.selectedCards.splice(
          this.selectedCards.findIndex(({ value }) => value === card.value),
          1
        );
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
