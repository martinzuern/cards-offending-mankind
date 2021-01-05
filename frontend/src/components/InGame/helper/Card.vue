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
    <!-- eslint-disable-next-line vue/no-v-html -->
    <span v-else v-html="htmlText"></span>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import MarkdownIt from 'markdown-it';

import { FlowType } from '@/helpers/FlowType';
import { PromptCard, ResponseCard } from '@/types';

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
    htmlText(): string {
      if (!this.card.value) return '';
      if (!md) md = new MarkdownIt({ typographer: true, html: true });
      const res = md.renderInline(this.card.value);
      return this.isWhite ? res : res.replaceAll('_', '______');
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

  &.black-card
    background-color: black
    color: white
    font-weight: 650

  &.white-card
    transition: all .2s ease-out, font-size 0
    cursor: pointer
    background-color: white
    border: 1px solid black
    font-weight: 550
    &.selected
      background-color: blue
      color: white
      box-shadow: 0 0 9px 1px blue

  &.turned-card
    line-height: 1
</style>
