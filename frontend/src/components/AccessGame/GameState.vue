<template>
  <div v-if="game && player">
    <!-- Game ended -->
    <template v-if="game.status === 'ended'">
      <div class="list-group">
        <div v-for="p in players" :key="p.id" class="list-group-item d-flex justify-content-between align-items-center">
          <strong>{{ p.nickname }}</strong>
          <span>{{ p.points }}</span>
        </div>
      </div>
    </template>

    <!-- Game not yet startet -->
    <template v-else-if="game.status === 'created'">
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
        :disabled="!(rounds && !rounds.length && players.length >= 3)"
        @click="startGame"
      >
        Start Game
      </button>
    </template>

    <!-- Game is running -->
    <template v-else>
      <b-row>
        <b-col cols="2" class="pt-2">
          <h5>Round {{ roundIndex + 1 }}</h5>
        </b-col>
        <b-col class="pt-2">
          <Countdown/>
        </b-col>
        <b-col cols="2" class="text-right">
          <b-button id="popover-leaderboard" variant="outline-secondary">🏅</b-button>
          <b-popover target="popover-leaderboard" triggers="click blur" placement="bottomleft">
            <template #title>Leaderboard</template>
            <div class="list-group leaderboard-list-group" style="">
              <div
                v-for="p in players"
                :key="p.id"
                class="list-group-item d-flex justify-content-between align-items-center"
              >
                <strong>{{ p.nickname }}</strong>
                <span>{{ p.points }}</span>
              </div>
            </div>
          </b-popover>
        </b-col>
      </b-row>

      <!-- Player is judge -->
      <template v-if="rounds && rounds.length && isJudge">
        <h2>👩🏻‍⚖️ Relax, you are judging this round.</h2>
        <h6 v-if="currentRound && currentRound.status === 'played'">Okay, it's your turn. Judge!</h6>
      </template>

      <div v-if="game && game.status === 'running'" class="play-card black-card mx-auto mt-5">
        {{ ((currentRound && currentRound.prompt) || {}).value }}
      </div>

      <Submissions v-if="currentRound && currentRound.submissions" />

      <div v-if="currentRound && currentRound.status === 'ended'" class="overlay mt-5">
        <button class="btn btn-success d-block mb-3 d-block w-100" @click="clickNextRound">Next Round</button>
        <button v-if="isHost" class="btn btn-secondary d-block w-100 mt-3" @click="clickEndGame">End Game</button>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import Submissions from './Submissions.vue';
import Countdown from './Countdown.vue';
import { OtherPlayer, Player, Game, Round } from '../../../../types';
import store from '../../store';

export default Vue.extend({
  name: 'GameState',
  components: {
    Submissions,
    Countdown,
  },
  computed: {
    gameUrl(): string {
      return location.toString();
    },
    isJudge(): boolean {
      return !!(this.player && this.currentRound && this.player.id === this.currentRound.judgeId);
    },
    isHost(): boolean {
      return !!(this.player && this.player.isHost);
    },
    game(): Game | undefined {
      return store.state.gameState?.game;
    },
    player(): Player | undefined {
      return store.state.player;
    },
    players(): OtherPlayer[] {
      return store.state.gameState?.players || [];
    },
    rounds(): Round[] | undefined {
      return store.state.gameState?.rounds;
    },
    currentRound(): Round | undefined {
      return store.getters.currentRound;
    },
    socket(): SocketIOClient.Socket | undefined {
      return store.state.socket;
    },
    roundIndex(): number {
      return store.getters.currentRoundIndex;
    },
  },
  methods: {
    copyGameUrl(): void {
      const input = this.$refs.shareUrl as HTMLInputElement;
      try {
        input.select();
        const success = document.execCommand('copy');
        input.setSelectionRange(0, 0);
        if (success) return;
      } catch {}
      alert('URL cannot be copied. Please copy manually.');
    },
    startGame(): void {
      this.socket && this.socket.emit('start_game');
    },
    clickNextRound(): void {
      this.socket && this.socket.emit('start_next_round');
    },
    clickEndGame(): void {
      this.socket && this.socket.emit('end_game');
    },
  },
});
</script>

<style lang="sass">
.leaderboard-list-group
  min-width: 10vw
</style>
