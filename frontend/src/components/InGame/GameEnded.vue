<template>
  <div>
    <h2>🏁 Game over</h2>
    <h6>Here is the final result.</h6>
    <div class="list-group mt-4">
      <div v-for="p in players" :key="p.id" class="list-group-item d-flex justify-content-between align-items-center">
        <strong>{{ p.nickname }}</strong>
        <span>{{ p.points }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import assert from 'assert';

import store from '../../store';
import { OtherPlayer } from '../../types';

export default Vue.extend({
  name: 'GameEnded',
  computed: {
    players(): OtherPlayer[] {
      assert(store.state.gameState?.players);
      return store.state.gameState.players;
    },
  },
});
</script>
