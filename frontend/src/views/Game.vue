<template>
  <div>
    <InGame v-if="token" :token="token" />
    <JoinGameForm v-else :game-id="gameId" />
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';

import InGame from '@/components/InGame/InGame.vue';
import JoinGameForm from '@/components/GameForm/JoinGameForm.vue';
import { UUID } from '../types';
import store from '../store';

export default Vue.extend({
  name: 'Game',
  components: {
    InGame,
    JoinGameForm,
  },
  computed: {
    gameId(): UUID {
      return this.$route.params.gameId as UUID;
    },
    token(): string | undefined {
      return store.getters.tokenForGame(this.gameId);
    },
  },
});
</script>
