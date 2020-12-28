<template>
  <b-progress v-if="totalSeconds > 0 && remainingSeconds >= 0" :max="totalSeconds" height="1.5rem">
    <b-progress-bar :value="remainingSeconds" variant="secondary">
      <span :class="`${remainingSeconds / totalSeconds > 0.5 ? 'countdown-left' : 'countdown-right'}`">
        {{ Math.round(remainingSeconds) }} seconds remaining
      </span>
    </b-progress-bar>
  </b-progress>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapValues, maxBy } from 'lodash';

import { Game } from '@/types';
import store from '@/store';

export default Vue.extend({
  name: 'Countdown',
  data() {
    return {
      now: new Date(),
      timer: null as null | number,
    };
  },
  computed: {
    gameTimeouts(): Game['timeouts'] | undefined {
      return store.state.gameState?.game?.timeouts;
    },
    currentRoundTimeouts(): Record<keyof Game['timeouts'], Date> | undefined {
      const timeouts = (store.getters.currentRound?.timeouts as unknown) as Game['timeouts'];
      if (!timeouts) return undefined;
      return mapValues(timeouts, (x) => new Date(x));
    },
    currentTimeoutKey(): keyof Game['timeouts'] | undefined {
      if (!this.currentRoundTimeouts) return undefined;
      const keys = Object.keys(this.currentRoundTimeouts) as (keyof Game['timeouts'])[];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return maxBy(keys, (o) => this.currentRoundTimeouts![o]);
    },
    totalSeconds(): number {
      if (!this.gameTimeouts || !this.currentTimeoutKey) return -1;
      return this.gameTimeouts[this.currentTimeoutKey];
    },
    remainingSeconds(): number {
      if (!this.currentRoundTimeouts || !this.currentTimeoutKey) return -1;
      const end = this.currentRoundTimeouts[this.currentTimeoutKey] as Date;
      return (end.getTime() - this.now.getTime()) / 1000;
    },
  },
  mounted() {
    this.timer = setInterval(() => {
      this.now = new Date();
    }, 1000);
  },
  beforeDestroy() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },
});
</script>

<style lang="sass" scoped>
.progress-bar
  transition: width 1s linear !important
  .countdown-right
    position: absolute
    right: 1.5rem
    color: black
  .countdown-left
    position: absolute
    left: 1.5rem
</style>
