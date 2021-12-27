import type { Socket } from 'socket.io-client';

import Vue from 'vue';
import Vuex from 'vuex';
import { createDirectStore } from 'direct-vuex';
import { last, get } from 'lodash';

import {
  Round,
  Game,
  MessageRoundUpdated,
  PackInformation,
  UUID,
  MessageCreateGame,
  MessageGameCreated,
  PlayerWithToken,
  Player,
  MessageJoinGame,
  MessagePlayerJoined,
  GameState,
} from '@/types';
import axios from '@/helpers/api';

export interface State {
  packs: PackInformation[];
  tokens: Record<string, string>;
  gameState?: Partial<GameState>;
  player?: Player;
  socket?: Socket;
}

Vue.use(Vuex);

function pop<T>(obj: T, key: keyof T): T[keyof T] {
  const val = obj[key];
  delete obj[key];
  return val;
}

const { store, rootActionContext, moduleActionContext, rootGetterContext, moduleGetterContext } = createDirectStore({
  state: (): State => {
    return {
      packs: [],
      tokens: {},
      gameState: undefined,
      player: undefined,
      socket: undefined,
    };
  },
  getters: {
    currentRound: (state): Round | undefined => last(state.gameState?.rounds),
    currentRoundIndex: (state): number => (state.gameState?.rounds?.length || 1) - 1,
    tokenForGame:
      (state) =>
      (id: UUID): string | undefined =>
        get(state.tokens, id),
  },
  mutations: {
    initializeStore(state): void {
      const tokens = localStorage.getItem('tokens');
      if (tokens) state.tokens = JSON.parse(tokens);
    },
    setGameState(state, gameState: State['gameState']): void {
      state.gameState = gameState;
    },
    setGame(state, game: Game): void {
      state.gameState = state.gameState || {};
      state.gameState.game = game;
    },
    setPlayer(state, player: State['player']): void {
      state.player = player;
    },
    setPacks(state, packs: State['packs']): void {
      state.packs = packs;
    },
    setRoundAtIndex(state, { round, roundIndex }: MessageRoundUpdated): void {
      const rounds = state.gameState?.rounds;
      rounds && rounds.splice(roundIndex, 1, round);
    },
    setSocket(state, socket: State['socket']): void {
      state.socket = socket;
    },
    setToken(state, { id, token }: { id: UUID; token: string }): void {
      state.tokens = { ...state.tokens, ...{ [id]: token } };
      localStorage.setItem('tokens', JSON.stringify(state.tokens));
    },
  },
  actions: {
    fetchPacks: async (context): Promise<void> => {
      const { commit } = rootActionContext(context);
      const response = await axios.get<PackInformation[]>('/packs');
      commit.setPacks(response.data);
    },
    createGame: async (context, { data }: { data: MessageCreateGame }): Promise<void> => {
      const { commit } = rootActionContext(context);
      const response = await axios.post<MessageGameCreated>(`/games`, data);
      const game = response.data.game;
      const token = pop<PlayerWithToken>(response.data.player, 'token') as string;
      const player: Player = response.data.player;
      commit.setGame(game);
      commit.setPlayer(player);
      commit.setToken({ id: game.id, token });
    },
    joinGame: async (context, { id, data }: { id: UUID; data: MessageJoinGame }): Promise<void> => {
      const { commit } = rootActionContext(context);
      const response = await axios.post<MessagePlayerJoined>(`/games/${id}/join`, data);
      const token = pop<PlayerWithToken>(response.data.player, 'token') as string;
      const player: Player = response.data.player;
      commit.setPlayer(player);
      commit.setToken({ id, token });
    },
  },
});

// Export the direct-store instead of the classic Vuex store.
export default store;

// The following exports will be used to enable types in the
// implementation of actions and getters.
export { rootActionContext, moduleActionContext, rootGetterContext, moduleGetterContext };

// The following lines enable types in the injected store '$store'.
export type AppStore = typeof store;
declare module 'vuex' {
  interface Store<S> {
    direct: AppStore;
  }
}
