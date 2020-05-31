<template>
  <div v-if="game || player">
    <template v-if="game.status === 'ended'">
      <div class="list-group">
        <div
          v-for="player in players"
          :key="player.id"
          class="list-group-item d-flex justify-content-between align-items-center">
            <strong>{{ player.nickname }}</strong>
            <span>{{ player.points }}</span>
          </div>
      </div>
    </template>
    <template v-else>
      <div class="card p-0">
        <div class="p-3">
          <h6>Invite other players to join</h6>
          <div
            class="badge badge-pill badge-secondary"
            :class="{ 'badge-success': player.isHost }">{{ game.id }}</div>
          <p class="mt-3 mb-0" v-if="players.length > 1">
            <h5 class="mt-3">Round {{ $store.state.roundIndex + 1 }}</h5>
            Other players in this game:
            <span
              v-for="(gamePlayer, index) in players"
              v-if="gamePlayer.nickname !== player.nickname"
              :key="gamePlayer.id">{{ gamePlayer.nickname }} <template v-if="index < players.length - 1">, </template></span>
          </p>
          <template v-if="rounds.length && isJudge">
            <p class="mb-0">
              You are the judge.
              <strong v-if="currentRound.status === 'played'">The round been played - please judge.</strong>
            </p>
          </template>
        </div>
        <button
          class="btn btn-success d-block w-100 mt-3"
          v-if="player.isHost && !rounds.length && players.length > 2"
          @click="startGame">Start Game</button>
      </div>

      <div
        class="play-card black-card mx-auto mt-5"
        v-if="game.status === 'running'">{{ (currentRound.prompt || {}).value }}</div>
      <div class="mt-5 alert alert-success" v-if="(currentRound.submissions || []).length">
        <h5>Submissions</h5>
        <div v-for="(submission, submissionIndex) in currentRound.submissions" :key="submission.timestamp">
          <div
            class="d-flex justify-content-center align-items-center"
            v-for="(card, index) in submission.cards"
            :key="index">
            <div
              @click="revealSubmissionForCard(submissionIndex)"
              class="play-card white-card">{{ card.value }}</div>
            <button
              v-if="isJudge && submission.isRevealed"
              class="ml-2 btn btn-success"
              @click="chooseWinner(submissionIndex)">Winner 🎉</button>
            <div
              class="ml-3"
              v-if="submission.playerId === player.id && submission.pointsChange">
              🎉 You won!
            </div>
            <div
              class="ml-3"
              v-else>
              {{ (players.find(({ id }) => id === submission.playerId) || {}).nickname }}
              </div>
          </div>
        </div>
      </div>
      <template v-if="currentRound.status === 'ended'">
        <button
          class="btn btn-success d-block mb-3 d-block w-100"
          @click="clickNextRound">Next Round</button>
        <button
          class="btn btn-secondary d-block w-100 mt-3"
          @click="clickEndGame">End Game</button>
      </template>
    </template>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue'
import { Player, Game, Round } from '../../../../types'

export default Vue.extend({
  name: 'GameState',
  computed: {
    isJudge(): boolean {
      return this.player.id === this.currentRound.judgeId
    },
    game(): Game {
      return this.$store.state.game
    },
    player(): Player {
      return this.$store.state.player
    },
    players(): Player[] {
      return this.$store.state.players
    },
    rounds(): Round[] {
      return this.$store.state.rounds
    },
    currentRound(): Round {
      return this.$store.getters.currentRound
    },
    socket(): any {
      return this.$store.state.socket
    },
    roundIndex(): number {
      return this.$store.state.roundIndex
    },
  },
  methods: {
    startGame(): any {
      this.socket.emit('start_game')
    },
    chooseWinner(index) {
      this.socket.emit(
        'choose_winner',
        {
          submissionIndex: index,
          roundIndex: this.roundIndex,
        },
      )
    },
    revealSubmissionForCard(index) {
      if (this.isJudge) {
        this.socket.emit(
          'reveal_submission',
          {
            submissionIndex: index,
            roundIndex: this.roundIndex,
          },
        )
      }
    },
    clickNextRound() {
      this.socket.emit('start_next_round')
    },
    clickEndGame(index) {
      this.socket.emit('end_game')
    },
  },
})
</script>

<style lang="sass">
// variables
$box-shadow-sketch: 0 1px 1px rgba(0, 0, 0, .04), 0 4px 5px rgba(0, 0, 0, .02), 0 7px 9px rgba(0, 0, 0, .04)
$box-shadow-card: $box-shadow-sketch, 0 25px 30px -15px rgba(0, 0, 0, .08), 0 15px 18px -30px rgba(0, 0, 0, .04)
$border-radius: 15px

.card
  box-shadow: $box-shadow-card
  border-color: transparent
  border-radius: 7px

.play-card
  padding: 1rem
  border-radius: $border-radius
  box-shadow: $box-shadow-card
  margin: .5rem
  font-weight: bold

  &.black-card
    width: 300px
    background-color: black
    color: white

  &.white-card
    width: 200px
    transition: all .2s ease-out
    cursor: pointer
    background-color: white
    &.selected
      background-color: blue
      color: white

</style>