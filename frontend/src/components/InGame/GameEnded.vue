<template>
  <div class="leaderboard-game-ended">
    <div class="container">
      <h2 class="mt-5">🏁 Game over</h2>
      <!-- add cah headline -->
      <h6>Here is the final result.</h6>
      ### podium space (card stack?)
      <Leaderboard class="mt-4" />
    </div>
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

<style lang="sass">
.leaderboard-game-ended
  left: 0
  top: 0
  bottom: 0
  right: 0
  color: white
  background-color: black
  position: fixed
</style>
