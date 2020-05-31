<template>
  <div class="deck my-5" v-if="player && player.id !== currentRound.judgeId && game.status === 'running'">
    <h5>Your Cards</h5>
    <div class="card-grid">
      <div
        v-for="card in player.deck"
        :key="card.value"
        :class="{ selected: selectedCards.find(({value}) => value === card.value) }"
        class="play-card white-card pt-5 pr-2 mx-auto"
        @click="clickToggleCard(card)">
        {{ card.value }}
      </div>
    </div>
    <button
      class="btn btn-success w-100 d-block mt-5"
      @click="submitSelection"
      v-if="currentRound.status === 'created'">Submit Selection</button>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue'
import { Player, Round, ResponseCard, Game } from '../../../../types'

export default Vue.extend({
  name: 'Deck',
  data() {
    return {
      selectedCards: [] as ResponseCard[],
    }
  },
  computed: {
    player(): Player {
      return this.$store.state.player
    },
    game(): Game {
      return this.$store.state.game
    },
    rounds(): Round[] {
      return this.$store.state.rounds
    },
    currentRound(): Round {
      return this.rounds[this.rounds.length - 1] || {}
    },
  },
  watch: {
    currentRound() {
      this.selectedCards.length = 0
    },
  },
  methods: {
    submitSelection() {
      this.$store.state.socket.emit('pick_cards', { roundIndex: this.rounds.length - 1, cards: this.selectedCards })
    },
    clickToggleCard(card) {
      if (!this.selectedCards.find(({value}) => value === card.value)) {
        this.selectedCards.push(card)
      } else {
        this.selectedCards.splice(
          this.selectedCards.findIndex(({value}) => value === card.value),
          1,
        )
      }
    },
  },
})
</script>

<style lang="sass">
.card-grid
  display: grid
  align-items: end
  grid-template-columns: repeat(2, 1fr)
  .play-card
    align-items: end

</style>