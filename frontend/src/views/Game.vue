<template>
  <div>
    <JoinGameForm v-if="!token" :game-id="gameId" />
    <InGame v-if="token" :token="token" />
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';

import InGame from '@/components/AccessGame/InGame.vue';
import JoinGameForm from '@/components/GameForm/JoinGameForm.vue';
import { UUID } from '../../types';
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
