/* jshint laxcomma:true */
/*
 * FlowType.JS without jQuery.
 * Ported by Christian Dannie Storgaard. Based on:
 *
 * FlowType.JS 1.1
 * Copyright (c) 2013, Simple Focus http://simplefocus.com/
 *
 * FlowType.JS by Simple Focus (http://simplefocus.com/)
 * is licensed under the MIT License. Read a copy of the
 * license in the LICENSE.txt file or at
 * http://choosealicense.com/licenses/mit
 *
 * Thanks to Giovanni Difeterici (http://www.gdifeterici.com/)
 */

export type FlowTypeOptions = {
  maximum?: number;
  minimum?: number;
  maxFont?: number;
  minFont?: number;
  fontRatio?: number;
  heightRatio?: number;
  paddingRatio?: number;
};

export class FlowType {
  static getHandler(el: HTMLElement, options: FlowTypeOptions): () => void {
    const {
      maximum = 9999,
      minimum = 1,
      maxFont = 9999,
      minFont = 1,
      fontRatio = 35,
      heightRatio,
      paddingRatio,
    } = options;

    const isOverflown = () => el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;

    const fn = () => {
      const elw = el.clientWidth;
      const width = elw > maximum ? maximum : elw < minimum ? minimum : elw;
      const fontBase = width / fontRatio;
      let fontSize = fontBase > maxFont ? maxFont : fontBase < minFont ? minFont : fontBase;
      el.style.fontSize = fontSize + 'px';

      if (heightRatio) el.style.height = elw * heightRatio + 'px';
      if (paddingRatio) el.style.padding = elw * paddingRatio + 'px';

      while (isOverflown() && fontSize > minFont) {
        fontSize--;
        el.style.fontSize = fontSize + 'px';
      }
    };

    return () => {
      window.requestAnimationFrame(fn);
    };
  }
}
