<template>
  <div class="leaderboard-game-ended">
    <div class="container">
      <h2 class="mt-5">🏁 Game over</h2>
      <h6>Here is the final result.</h6>

      <b-row class="d-flex podium">
        <b-col v-for="place in [2, 1, 3]" :key="place" md="4" class="step-container m-0 p-0" :class="`place-${place}`">
          <div>
            <b-badge v-for="p in podiumPlayers[place - 1]" :key="p.id" pill>
              <b-icon icon="award"></b-icon>
              {{ p.nickname }}
            </b-badge>
          </div>
          <div class="step">{{ place }}</div>
        </b-col>
      </b-row>

      <Leaderboard class="mt-4" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import assert from 'assert';
import { groupBy } from 'lodash';

import { OtherPlayer } from '@/types';
import store from '@/store';
import Leaderboard from './helper/Leaderboard.vue';

export default Vue.extend({
  name: 'GameEnded',
  components: {
    Leaderboard,
  },
  computed: {
    podiumPlayers(): OtherPlayer[][] {
      assert(store.state.gameState);
      const playersByPoints = groupBy(store.state.gameState.players, 'points');
      const topPoints = Object.keys(playersByPoints).map(Number).sort().reverse();
      return Array(3)
        .fill(0)
        .map((_val, i) => playersByPoints[topPoints[i]] || []);
    },
  },
});
</script>

<style lang="sass">
.leaderboard-game-ended
  left: 0
  top: 0
  bottom: 0
  right: 0
  color: white
  background-color: black
  position: fixed

  .podium
    min-height: 18rem

    .step-container
      flex: 1
      display: flex
      flex-direction: column

      &>div:first-child
        margin-top: auto
        text-align: center
        padding: 1rem

        .badge
          white-space: normal
          color: black

      .step
        text-align: center
        background-color: #383d41
        font-weight: bold
        font-size: 4rem

      &.place-1
        .step
          height: 60%
        .badge
          background-color: #C9B037

      &.place-2
        .step
          height: 45%
        .badge
          background-color: #D7D7D7

      &.place-3
        .step
          height: 40%
        .badge
          background-color: #AD8A56
</style>
