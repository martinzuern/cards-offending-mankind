import { FullGameState, Pack } from '../../../root-types';

import CardDecks from 'json-against-humanity/full.md.json';

import L from '../../common/logger';

export class GameService {
  getAvailableDecks(): Pack[] {
    return Object.entries(CardDecks.metadata).map(([abbr, entry]) => ({...entry, abbr}));
  }
}

export default new GameService();
