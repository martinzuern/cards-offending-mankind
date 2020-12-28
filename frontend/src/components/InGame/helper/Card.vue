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
    <span v-else>{{ value }}</span>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import { FlowType } from '@/helpers/FlowType';

export default Vue.extend({
  name: 'Card',
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
  mounted() {
    const el = this.$refs.card as HTMLElement;
    const fontRatio = this.turnedBackside ? 7 : 10;
    this.resizeHandler = FlowType.getHandler(el, { fontRatio, heightRatio: 1.4 });
    window.addEventListener('resize', this.resizeHandler, false);
    // Calling twice due to nasty bug in the card fan
    this.$nextTick(() => this.resizeHandler());
    setTimeout(() => this.resizeHandler(), 400);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeHandler);
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
  hyphens: auto
  font-weight: bold
  white-space: pre-line
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
