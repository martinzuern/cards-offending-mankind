<template>
  <div
    ref="card"
    class="play-card"
    :class="{
      'white-card': isWhite,
      'black-card': !isWhite,
      'turned-card': turnedBackside,
      selected,
    }"
    @click="$emit('click')"
  >
    <span v-if="turnedBackside">Cards<br />Offending<br />Mankind</span>
    <div v-else class="h-100 d-flex flex-column justify-content-between">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span class="card-content" v-html="htmlText"></span>
      <div class="card-pack pt-2" :title="cardPack.name">
        <i v-if="(cardPack.icon || '').startsWith('la')" :class="`las ${cardPack.icon}`"></i>
        <span v-else-if="cardPack.icon" class="px-1 border rounded-lg">
          {{ cardPack.icon }}
        </span>
        <i v-else class="las la-stop"></i>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import assert from 'assert';
import MarkdownIt from 'markdown-it';

import { FlowType } from '@/helpers/FlowType';
import { Pack, PromptCard, ResponseCard } from '@/types';
import store from '@/store';

let md: MarkdownIt;

export default Vue.extend({
  name: 'Card',
  props: {
    selected: {
      type: Boolean,
      default: false,
    },
    card: {
      type: Object as PropType<PromptCard | ResponseCard>,
      default: {},
    },
  },
  data() {
    return { resizeHandler: (undefined as unknown) as () => void | undefined };
  },
  computed: {
    isWhite(): boolean {
      return (this.card as PromptCard).pick === undefined;
    },
    turnedBackside(): boolean {
      return this.card.value === undefined;
    },
    cardPack(): Pack {
      assert(store.state.gameState?.game);
      const pack = store.state.gameState?.game.packs.find((p) => p.abbr === this.card.packAbbr);
      assert(pack);
      return pack;
    },
    htmlText(): string {
      if (!this.card.value) return '';
      if (!md) md = new MarkdownIt({ typographer: true, html: true });
      const res = md.renderInline(this.card.value);
      return this.isWhite ? res : res.replaceAll('_', '______');
    },
  },
  watch: {
    htmlText: function () {
      this.resizeHandler();
    },
  },
  mounted() {
    const el = this.$refs.card as HTMLElement;
    const fontRatio = this.turnedBackside ? 7 : this.isWhite ? 9.5 : 10.5;
    this.resizeHandler = FlowType.getHandler(el, { fontRatio, heightRatio: 1.4, paddingRatio: 0.075 });
    window.addEventListener('resize', this.resizeHandler, false);
    window.addEventListener('orientationchange', this.resizeHandler, false);
    // Calling twice due to nasty bug in the card fan
    this.$nextTick(() => this.resizeHandler());
    setTimeout(() => this.resizeHandler(), 400);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.resizeHandler);
  },
});
</script>

<style lang="sass" scoped>
.play-card
  height: $card-height
  width: $card-width
  padding: .8rem
  border-radius: $border-radius
  box-shadow: $box-shadow-card
  margin: .5rem
  line-height: 1.2

  .card-pack
    span
      font-size: 70%
    i
      font-size: 80%

  &.black-card
    background-color: black
    color: white
    font-weight: 650

    .card-pack .border
      border-color: white

  &.white-card
    transition: all .2s ease-out, font-size 0
    cursor: pointer
    background-color: white
    border: 1px solid black
    font-weight: 550

    .card-pack .border
      border-color: black

    &.selected
      background-color: blue
      color: white
      box-shadow: 0 0 9px 1px blue

      .card-pack .border
        border-color: white

  &.turned-card
    line-height: 1
</style>
