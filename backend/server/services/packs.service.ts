import _ from 'lodash';
import CardDecksRaw from 'json-against-humanity/cah-all-compact.json';

import { Deck, PackInformation } from '../../root-types';

export const cardDecks: Record<string, Deck> = CardDecksRaw.packs.reduce((acc, pack) => {
  const { abbr, name, official, white, black } = pack;
  const prompts = black.map((i) => CardDecksRaw.black[i]);
  const responses = white.map((i) => ({ text: CardDecksRaw.white[i] }));
  return {
    ...acc,
    [abbr]: {
      abbr,
      name,
      official,
      prompts,
      responses,
    },
  };
}, {});

export const packInformation: PackInformation[] = _.chain(cardDecks)
  .values()
  .map((el) =>
    _.chain(el)
      .cloneDeep()
      .merge({
        promptsCount: el.prompts.length,
        responsesCount: el.responses.length,
      })
      .omit(['prompts', 'responses'])
      .value()
  )
  .orderBy(['official', 'responsesCount'], ['desc', 'desc'])
  .value();
