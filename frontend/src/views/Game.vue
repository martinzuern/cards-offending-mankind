<template>
  <div>
    <template v-if="stallJoining">
      <h2>
        It appears that you or your browser triggered a reload. 🤦‍♀️
      </h2>
      <h6>
        Client will reconnect in 35 seconds. Please don't trigger a reload manually before.
      </h6>
    </template>
    <template v-else>
      <Form v-if="!token" :game-id="$route.params.gameId" :game-token="token" />
      <InGame v-if="token" :token="token" />
    </template>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import InGame from '@/components/AccessGame/InGame.vue';
import Form from '@/components/NewGame/Form.vue';
import { Player } from '../../../types';
import store from '../store';

export default Vue.extend({
  name: 'Game',
  components: {
    InGame,
    Form,
  },
  data() {
    return {
      stallJoining: false as boolean,
    };
  },
  computed: {
    reloaded(): boolean {
      return !!this.token && !this.player?.id;
    },
    player(): Player | undefined {
      return store.state.player;
    },
    socket(): SocketIOClient.Socket | undefined {
      return store.state.socket;
    },
    token(): string | null {
      return localStorage.getItem(`token:${this.$route.params.gameId}`);
    },
  },
  watch: {
    reloaded: {
      handler(value): void {
        if (value) {
          this.stallJoining = true;
          setTimeout(() => {
            this.stallJoining = false;
          }, 35000);
        }
      },
      immediate: true,
    },
  },
});
</script>
