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

export default Vue.extend({
  name: 'Game',
  components: {
    InGame,
    JoinGameForm,
  },
  computed: {
    gameId(): string {
      return this.$route.params.gameId;
    },
    token(): string | null {
      return localStorage.getItem(`token:${this.gameId}`);
    },
  },
});
</script>
