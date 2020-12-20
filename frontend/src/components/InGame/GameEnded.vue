<template>
  <div>
    <h2>🏁 Game over</h2>
    <h6>Here is the final result.</h6>
    <Leaderboard class="mt-4" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import Leaderboard from './helper/Leaderboard.vue';

export default Vue.extend({
  name: 'GameEnded',
  components: {
    Leaderboard,
  },
});
</script>
