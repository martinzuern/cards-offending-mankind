<template>
  <div>
    <div class="card">
      <div class="card-body">
        <h6>Invite other players to join!</h6>

        <b-form-group label="Share this URL with your friends." label-for="share-url" class="mt-3">
          <b-input-group>
            <b-form-input id="share-url" ref="shareUrl" readonly :value="gameUrl" />
            <b-input-group-append>
              <b-button variant="outline-success" @click="copyGameUrl">Copy</b-button>
            </b-input-group-append>
          </b-input-group>
        </b-form-group>

        <p class="mt-3 mb-0">
          Players currently in this game:
          {{ players.map((p) => p.nickname).join(', ') }}
        </p>
      </div>
    </div>

    <button
      v-if="player.isHost"
      class="btn btn-success d-block w-100 mt-3"
      :disabled="!(players.length >= 3)"
      @click="startGame"
    >
      Start Game
    </button>
  </div>
</template>

<script lang="ts">
/* global SocketIOClient */
import Vue from 'vue';
import assert from 'assert';

import store from '../../store';
import { Player, OtherPlayer } from '../../types';

export default Vue.extend({
  name: 'GameCreated',
  computed: {
    player(): Player {
      assert(store.state.player);
      return store.state.player;
    },
    players(): OtherPlayer[] {
      assert(store.state.gameState?.players);
      return store.state.gameState.players;
    },
    socket(): SocketIOClient.Socket {
      assert(store.state.socket);
      return store.state.socket;
    },
    gameUrl(): string {
      return location.toString();
    },
  },
  methods: {
    startGame(): void {
      this.socket.emit('start_game');
    },
    copyGameUrl(): void {
      const input = this.$refs.shareUrl as HTMLInputElement | undefined;
      if (!input) return;
      try {
        input.select();
        const success = document.execCommand('copy');
        input.setSelectionRange(0, 0);
        if (success) return;
      } catch {}
      alert('URL cannot be copied. Please copy manually.');
    },
  },
});
</script>
