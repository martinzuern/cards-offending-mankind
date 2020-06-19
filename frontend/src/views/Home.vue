<template>
  <div class="home">
    <CreateGame />
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import CreateGame from '@/components/CreateGame/CreateGame.vue';

export default Vue.extend({
  name: 'Home',
  components: {
    CreateGame,
  },
});
</script>
