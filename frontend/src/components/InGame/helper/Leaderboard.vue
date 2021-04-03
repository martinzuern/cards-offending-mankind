<template>
  <div class="leaderboard">
    <div
      v-for="p in players"
      :key="p.id"
      class="d-flex justify-content-between align-items-center mb-1"
      :class="{ 'text-muted': p.id != player.id }"
    >
      <strong class="leaderboard-nickname">
        {{ p.isAI ? '🤖' : '' }}
        {{ p.nickname }}
        <i v-if="!p.isActive">(inactive)</i>
      </strong>
      <span>{{ p.points }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import assert from 'assert';
import { sortBy } from 'lodash';

import { Player, OtherPlayer } from '@/types';
import store from '@/store';

export default Vue.extend({
  name: 'Leaderboard',
  computed: {
    player(): Player {
      assert(store.state.player);
      return store.state.player;
    },
    players(): OtherPlayer[] {
      assert(store.state.gameState?.players);
      return sortBy(store.state.gameState.players, 'points').reverse();
    },
  },
});
</script>

<style lang="sass" scoped>
.leaderboard-nickname
  padding-right: 1rem
</style>
