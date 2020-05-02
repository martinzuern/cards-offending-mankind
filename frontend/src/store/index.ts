import Vue from 'vue';
import Vuex from 'vuex';
import axios from '@/helpers/api.ts'
import { Game, Player } from '../../types'
import { get } from 'lodash'

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    game: {} as Game,
    player: {} as Player,
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
        },
      }
    },
    callAPI: (state, getters) => ({ apiAction = {}, payload = {} }) => {
      return axios()({ ...apiAction, data: payload })
    },
  },
  mutations: {
    setGame(state, game) {
      state.game = game
    },
    setPlayer(state, player) {
      state.player = player
    },
  },
  actions: {
    executeAPI: ({ state, getters, dispatch }, { action, payload }) => {
      const apiAction = get(getters.apiFunction(payload), action)
      return getters.callAPI({ apiAction, payload })
        .then((response: any) => {
          dispatch('resolveResponse', { action, response })
          return response
        })
        .catch((error: Error) => {
          return error
        })
    },
    resolveResponse: ({ state, commit }, { action, response }) => {
      switch (action) {
        case 'game.create':
          const { player, game } = response.data
          commit('setGame', game)
          commit('setPlayer', player)
          break;
        default:
      }
    },
  },
  modules: {
  },
});
