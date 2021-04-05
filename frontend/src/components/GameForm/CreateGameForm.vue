<template>
  <GameForm>
    <template v-if="isLoading">
      <div class="text-center my-3">
        <b-spinner label="Loading ..."></b-spinner>
      </div>
    </template>

    <template v-else>
      <b-form ref="form" novalidate :validated="validated" @submit.prevent="onSubmit">
        <b-form-group label="Your Name" label-for="nickname">
          <b-form-input
            id="nickname"
            v-model="player.nickname"
            type="text"
            placeholder="John Doe"
            required
            minlength="3"
          />
          <b-form-invalid-feedback>Your name must be at least 3 characters.</b-form-invalid-feedback>
        </b-form-group>
        <b-form-group>
          <b-row class="justify-content-between">
            <b-col cols="auto">
              <label for="packs">Game packs</label>
            </b-col>
            <b-col cols="auto" class="font-weight-normal">
              <b-form-checkbox v-model="onlyOffical" switch>only official</b-form-checkbox>
            </b-col>
          </b-row>
          <Multiselect
            id="packs"
            v-model="game.packs"
            :options="filteredPacks"
            :multiple="true"
            :close-on-select="false"
            :clear-on-select="false"
            placeholder="Select a pack"
            label="name"
            track-by="name"
          >
            <template slot="option" slot-scope="props">
              {{ props.option.name }}
              <small class="mt-1">
                <b-icon v-if="!props.option.official" icon="people-fill" />
                {{ props.option.promptsCount }} prompts / {{ props.option.responsesCount }} responses
              </small>
            </template>
          </Multiselect>
          <b-form-invalid-feedback :state="!validated || validationPacks">
            You need at least 25 prompts and 50 responses.
          </b-form-invalid-feedback>
        </b-form-group>

        <b-form-group
          label="Password (optional)"
          label-for="password"
          class="mt-2"
          description="If you set one, other players have to enter it before joining."
        >
          <b-form-input id="password" v-model="game.password" type="password" autocomplete="off" />
        </b-form-group>

        <!-- Advanced settings -->
        <b-row>
          <b-col>
            <b-link v-b-toggle.collapse-advanced class="mt-2">
              <b-icon icon="card-list" class="mr-1" />
              Advanced settings
            </b-link>
            <b-collapse id="collapse-advanced">
              <b-form-group
                label="Hand size"
                label-for="handSize"
                class="mt-2"
                description="Number of cards dealt to each player's hand."
              >
                <b-form-input id="handSize" v-model.number="game.handSize" type="number" min="2" max="20" />
              </b-form-group>

              <b-form-group
                class="mt-2"
                description="Once a player has reached the number of points the game ends automatically. If no number is set, it runs until it is manually ended."
              >
                <b-row class="justify-content-between">
                  <b-col cols="auto">
                    <label for="winnerPoints">Winner points</label>
                  </b-col>
                  <b-col cols="auto" class="font-weight-normal">
                    <b-form-checkbox
                      :checked="game.winnerPoints !== false"
                      switch
                      @change="game.winnerPoints = game.winnerPoints === false ? 20 : false"
                      >enabled</b-form-checkbox
                    >
                  </b-col>
                </b-row>
                <b-form-input
                  v-if="game.winnerPoints !== false"
                  id="winnerPoints"
                  v-model.number="game.winnerPoints"
                  type="number"
                  min="1"
                />
                <b-form-input v-else id="winnerPoints" disabled placeholder="Game continues until ended manually" />
              </b-form-group>

              <b-form-group label-cols-lg="2" label="House Rules" class="mt-2" label-class="pt-0">
                <b-form-group
                  label="Rando Cardrissian:"
                  label-for="aiPlayers"
                  label-cols-sm="6"
                  label-align-sm="right"
                  description="Number of additional virtual players (between 0 and 3)."
                >
                  <b-form-input
                    id="aiPlayers"
                    v-model.number="game.specialRules.aiPlayerCount"
                    type="number"
                    min="0"
                    max="3"
                  />
                </b-form-group>

                <b-form-group
                  label="Packing Heat:"
                  label-for="pickExtra"
                  label-cols-sm="6"
                  label-align-sm="right"
                  description="For cards with pick 2+, players are dealt an extra card."
                  disabled="disabled"
                >
                  <b-form-checkbox
                    id="pickExtra"
                    v-model="game.specialRules.pickExtra"
                    class="font-weight-normal"
                    switch
                  >
                    {{ game.specialRules.pickExtra ? 'Enabled' : 'Disabled' }}
                  </b-form-checkbox>
                </b-form-group>

                <b-form-group
                  label="Rebooting the Universe:"
                  label-for="allowDiscarding"
                  label-cols-sm="6"
                  label-align-sm="right"
                  description="Players can trade the specified number of points to discard as many cards as they want and get new cards."
                >
                  <b-form-checkbox
                    id="allowDiscarding"
                    v-model="game.specialRules.allowDiscarding.enabled"
                    class="font-weight-normal"
                    switch
                  >
                    {{ game.specialRules.allowDiscarding.enabled ? 'Enabled' : 'Disabled' }}
                  </b-form-checkbox>
                  <b-form-group
                    label="Discarding Penalty:"
                    label-for="discardingPenalty"
                    label-size="sm"
                    class="my-1 font-weight-normal"
                    label-cols-sm="7"
                  >
                    <b-form-input
                      id="discardingPenalty"
                      v-model.number="game.specialRules.allowDiscarding.penalty"
                      :disabled="!game.specialRules.allowDiscarding.enabled"
                      size="sm"
                      type="number"
                      min="0"
                      max="5"
                    />
                  </b-form-group>
                </b-form-group>
              </b-form-group>

              <b-form-group label-cols-lg="2" label="Timeouts" class="mt-2 mb-0" label-class="pt-0">
                <b-form-group label="Playing:" label-for="timeout-playing" label-cols-sm="6" label-align-sm="right">
                  <b-form-input
                    id="timeout-playing"
                    v-model.number="game.timeouts.playing"
                    type="number"
                    min="5"
                    max="600"
                  ></b-form-input>
                </b-form-group>
                <b-form-group label="Revealing:" label-for="timeout-revealing" label-cols-sm="6" label-align-sm="right">
                  <b-form-input
                    id="timeout-revealing"
                    v-model.number="game.timeouts.revealing"
                    type="number"
                    min="5"
                    max="600"
                  ></b-form-input>
                </b-form-group>
                <b-form-group label="Judging:" label-for="timeout-judging" label-cols-sm="6" label-align-sm="right">
                  <b-form-input
                    id="timeout-judging"
                    v-model.number="game.timeouts.judging"
                    type="number"
                    min="5"
                    max="600"
                  ></b-form-input>
                </b-form-group>
                <b-form-group
                  label="Between rounds:"
                  label-for="timeout-betweenRounds"
                  label-cols-sm="6"
                  label-align-sm="right"
                >
                  <b-form-input
                    id="timeout-betweenRounds"
                    v-model.number="game.timeouts.betweenRounds"
                    type="number"
                    min="5"
                    max="600"
                  ></b-form-input>
                </b-form-group>
              </b-form-group>
            </b-collapse>
          </b-col>
        </b-row>

        <b-form-group description="You need at least 3 players (2+ humans) to start the game.">
          <b-button type="submit" variant="success" size="sm" class="mt-3">
            <b-icon icon="check" class="mr-1" />
            Create a new game
          </b-button>
        </b-form-group>
      </b-form>
    </template>
  </GameForm>
</template>

<script lang="ts">
import Vue from 'vue';
import Multiselect from 'vue-multiselect';
import { sortBy } from 'lodash';

import 'vue-multiselect/dist/vue-multiselect.min.css';

import { CreateGame, CreatePlayer, PackInformation, MessageCreateGame } from '@/types';
import store from '@/store';

import GameForm from './GameForm.vue';

export default Vue.extend({
  name: 'CreateGameForm',
  components: {
    GameForm,
    Multiselect,
  },
  data() {
    return {
      onlyOffical: true,
      game: {
        timeouts: {
          playing: 180,
          revealing: 90,
          judging: 90,
          betweenRounds: 30,
        },
        winnerPoints: false,
        handSize: 10,
        password: '',
        packs: [],
        specialRules: {
          aiPlayerCount: 0,
          allowDiscarding: {
            enabled: true,
            penalty: 0,
          },
          pickExtra: false,
        },
      } as Required<CreateGame>,
      player: {
        nickname: '',
      } as CreatePlayer,
      errors: [] as unknown[],
      loading: false,
      validated: false,
    };
  },
  computed: {
    packs(): PackInformation[] {
      return store.state.packs;
    },
    isLoading(): boolean {
      return this.loading || this.packs.length === 0;
    },
    filteredPacks(): PackInformation[] {
      let packs = this.packs;
      if (this.onlyOffical) packs = packs.filter((p) => p.official);
      return sortBy(packs, [(p) => !p.abbr.startsWith('Base'), (p) => !p.official, (p) => p.name]);
    },
    validationPacks(): boolean {
      const prompts = (this.game.packs as PackInformation[])
        .map((p) => p?.promptsCount || 0)
        .reduce((pv, cv) => pv + cv, 0);
      const responses = (this.game.packs as PackInformation[])
        .map((p) => p?.responsesCount || 0)
        .reduce((pv, cv) => pv + cv, 0);
      return this.game.packs.length > 0 && prompts >= 25 && responses >= 50;
    },
  },
  watch: {
    player: {
      handler(player: CreatePlayer) {
        localStorage.nickname = player.nickname;
      },
    },
  },
  mounted() {
    store.dispatch.fetchPacks().then(() => (this.game.packs = this.packs.filter((p) => p.abbr === 'Base-US')));
    if (localStorage.nickname) {
      this.player.nickname = localStorage.nickname;
    }
  },
  methods: {
    onSubmit(): void {
      // Check valid form
      if (!this.$refs.form || !(this.$refs.form as HTMLFormElement).checkValidity() || !this.validationPacks) {
        this.validated = true;
        return;
      }

      this.loading = true;
      const { game, player } = this;
      const data: MessageCreateGame = { game, player };
      store.dispatch
        .createGame({ data })
        .then(() => {
          const gameId = store.state.gameState?.game?.id;
          if (gameId) this.$router.push({ name: 'Game', params: { gameId } });
        })
        .catch((err: Error) => {
          Vue.$log.error('Error while createGame.', err);
          this.errors.push(err);
        });
    },
  },
});
</script>
