export interface Pack {
  abbr: string;
  name: string;
  official: boolean;
  icon?: string;
  description?: string;
}

export interface PackInformation extends Pack {
  promptsCount: number;
  responsesCount: number;
}

export enum CardType {
  // Currently, we only support text cards
  Text = 'text',
}

interface GenericCard {
  type: CardType;
  value: string;
  packAbbr: Pack['abbr'];
}

export interface PromptCard extends GenericCard {
  draw: number;
  pick: number;
}

export interface ResponseCard extends GenericCard {}
