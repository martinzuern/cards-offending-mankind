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
    <span v-else>
      <VueMarkdown :source="text" :linkify="false" :task-lists="false" :toc="false" />
    </span>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import VueMarkdown from 'vue-markdown';

import { FlowType } from '@/helpers/FlowType';

export default Vue.extend({
  name: 'Card',
  components: {
    VueMarkdown,
  },
  props: {
    turnedBackside: {
      type: Boolean,
      default: false,
    },
    isWhite: {
      type: Boolean,
      default: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    value: {
      type: String,
      default: '',
    },
  },
  data() {
    return { resizeHandler: (undefined as unknown) as () => void | undefined };
  },
  computed: {
    text(): string {
      return this.isWhite ? this.value : this.value.replaceAll('_', '______');
    },
  },
  mounted() {
    const el = this.$refs.card as HTMLElement;
    const fontRatio = this.turnedBackside ? 7 : 9.5;
    this.resizeHandler = FlowType.getHandler(el, { fontRatio, heightRatio: 1.4 });
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
  font-weight: bold
  word-wrap: break-word
  line-height: 1.2

  &.black-card
    background-color: black
    color: white

  &.white-card
    transition: all .2s ease-out, font-size 0
    cursor: pointer
    background-color: white
    border: 1px solid black
    &.selected
      background-color: blue
      color: white
      box-shadow: 0 0 9px 1px blue

  &.turned-card
    line-height: 1
</style>
