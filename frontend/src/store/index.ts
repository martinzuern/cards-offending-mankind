import Vue from 'vue';
import Vuex from 'vuex';
import axios from '@/helpers/api.ts';
import { Game, Player, Round, Pack } from '../../types';
import { get } from 'lodash';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    game: {} as Game,
    player: {} as Player,
    rounds: [] as Round[],
    players: [] as Player[],
    socket: {} as any,
    roundIndex: 0 as number,
    packs: [] as Pack[],
  },
  getters: {
    apiFunction: (state) => (payload = {}, id?: number) => {
      return {
        game: {
          create: {
            url: `/games`,
            method: 'post',
          },
          get: {
            url: `/games/${id}`,
            method: 'get',
          },
          join: {
            url: `/games/${id}/join`,
            method: 'post',
          },
        },
        packs: {
          get: {
            url: '/packs',
            method: 'get',
          },
        },
      };
    },
    callAPI: (state, getters) => ({ apiAction = {}, payload = {} }) => {
      return axios()({ ...apiAction, data: payload });
    },
    currentRound: (state, getters) => {
      return state.rounds[state.roundIndex] || {};
    },
  },
  mutations: {
    setGame(state, game) {
      state.game = game;
    },
    setPlayer(state, player) {
      state.player = player;
    },
    setRounds(state, rounds) {
      state.rounds = rounds;
    },
    setPacks(state, packs) {
      state.packs = packs;
    },
    setRoundAtIndex(state, { round, index }) {
      state.rounds.splice(index, 1, round);
    },
    setPlayers(state, players) {
      state.players = players;
    },
    setSocket(state, socket) {
      state.socket = socket;
    },
    setRoundIndex(state, value) {
      state.roundIndex = value;
    },
  },
  actions: {
    executeAPI: ({ state, getters, dispatch }, { action, payload, id = null }) => {
      const apiAction = get(getters.apiFunction(payload, id), action);
      return getters
        .callAPI({ apiAction, payload })
        .then((response: any) => {
          dispatch('resolveResponse', { action, response });
          return response;
        })
        .catch((error: Error) => {
          return error;
        });
    },
    resolveResponse: ({ state, commit }, { action, response }) => {
      const storageData = {} as any;
      switch (action) {
        case 'packs.get':
          commit('setPacks', response.data);
          break;
        case 'game.get':
          commit('setGame', response.data.game);
          break;
        case 'game.create':
          commit('setGame', response.data.game);
          commit('setPlayer', response.data.player);
          storageData[state.game.id] = response.data.player.token;
          localStorage.token = JSON.stringify(storageData);
          break;
        case 'game.join':
          commit('setPlayer', response.data.player);
          storageData[state.game.id] = response.data.player.token;
          localStorage.token = JSON.stringify(storageData);
          break;
        default:
      }
    },
  },
  modules: {},
});
