<template>
  <div>
    <div>
      <h3 class="pt-5 cah-headline color-black">Invite other players 🙇🏻‍♂️</h3>
      <div class="border border-dark p-3 rounded mt-3">
        <b-form-group label="Share this URL with your friends." label-for="share-url">
          <b-input-group>
            <b-form-input id="share-url" ref="shareUrl" readonly :value="gameUrl" />
            <b-input-group-append>
              <b-button variant="secondary" @click="copyGameUrl">
                <b-icon icon="stickies-fill" />
              </b-button>
            </b-input-group-append>
          </b-input-group>
        </b-form-group>

        <h6>Players currently in this game 👋🏻</h6>
        <p class="mb-0">
          <span v-for="{ nickname } in players" :key="nickname" class="badge badge-secondary mr-1">{{ nickname }}</span>
        </p>
      </div>

      <button
        v-if="player.isHost"
        class="btn d-block w-50 btn-lg mx-auto my-5 btn-start-game"
        :class="canStartGame ? 'btn-success' : 'btn-secondary'"
        :disabled="!canStartGame"
        @click="startGame"
      >
        <span v-if="canStartGame">Start Game</span>
        <span v-else>You need at least 3 players (2+ humans) to start the game</span>
      </button>
      <p v-else class="text-center font-weight-bold py-4">Waiting for the host to start the game ...</p>

      <h3 class="pt-5 cah-headline color-black">Rules 👩🏻‍⚖️</h3>
      <div class="text-muted mt-3">
        <p>In the beginning of the game, each player gets {{ game.handSize }} white cards.</p>
        <p>
          One randomly chosen player begins as the judge and reads the question or fill-in-the-blank phrase on the black
          card out loud. Everyone else answers the question or fills in the blank by selecting one white card. The judge
          randomly chooses cards and shares each card combination with the group.
        </p>
        <p>
          For full effect the judge should usually reread the black card before presenting each answer. The judge then
          picks a favorite, and whoever played the answer gets one point. After the round, a new player becomes the
          judge, and everyone's cards are refilled to {{ game.handSize }} cards.
        </p>
        <h6>Pick two</h6>
        <p>
          Some cards say pick two. To answer these, each player place to white cards in combination. Play them in the
          order that the judge should read, the order matters.
        </p>
        <template v-if="game.specialRules.allowDiscarding.enabled">
          <h6>Rebooting the universe</h6>
          <p v-if="!!game.specialRules.allowDiscarding.penalty">
            Players may trade in {{ game.specialRules.allowDiscarding.penalty }} points to return as many cards as
            they'd like to the deck and draw back up to {{ game.handSize }}.
          </p>
          <p v-else>
            Players may return as many cards as they'd like to the deck and draw back up to {{ game.handSize }}.
          </p>
        </template>
        <template v-if="!!game.specialRules.aiPlayerCount">
          <h6>Rando Cardrissian</h6>
          <p>
            Every round, a random white card is placed into the play. This card belongs to an imaginary player named
            Rando Cardrissian, and if he wins the game, all players go home in a state of everlasting shame.
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import assert from 'assert';
import type { Socket } from 'socket.io-client';

import { Player, OtherPlayer, Game } from '@/types';
import store from '@/store';
import SocketEmitter from '@/helpers/SocketEmitter';

export default Vue.extend({
  name: 'GameCreated',
  computed: {
    player(): Player {
      assert(store.state.player);
      return store.state.player;
    },
    game(): Game {
      assert(store.state.gameState?.game);
      return store.state.gameState.game;
    },
    players(): OtherPlayer[] {
      assert(store.state.gameState?.players);
      return store.state.gameState.players;
    },
    socket(): SocketEmitter {
      assert(store.state.socket);
      return new SocketEmitter(store.state.socket as Socket);
    },
    gameUrl(): string {
      return location.toString();
    },
    canStartGame(): boolean {
      const activePlayers = this.players.filter((p) => p.isActive);
      const activeHumanPlayers = this.players.filter((p) => p.isActive && !p.isAI);
      return this.player.isHost && activePlayers.length >= 3 && activeHumanPlayers.length >= 2;
    },
  },
  methods: {
    startGame(): void {
      this.socket.startGame();
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

<style lang="sass" scoped>
@import '@/sass/_utilities.sass'

.btn-start-game
  &:disabled
    line-height: 130%
    font-size: 95%
</style>
