import Vue from 'vue';

// Needed as long as this issue is open:
// https://github.com/justinkames/vuejs-logger/issues/33
declare module 'vue/types/vue' {
  export interface VueConstructor<V extends Vue = Vue> {
    $log: {
      debug(...args: any[]): void;
      info(...args: any[]): void;
      warn(...args: any[]): void;
      error(...args: any[]): void;
      fatal(...args: any[]): void;
    };
  }
}
