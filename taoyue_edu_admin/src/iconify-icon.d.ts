/**
 * iconify-icon 类型声明
 * `iconify-icon` 是通过 index.html 中 CDN 加载的 Web Component，
 * TypeScript 默认不认识这个自定义元素，这里通过扩展全局 JSX 类型，
 * 让 tsc 类型检查通过。
 */
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': {
        icon?: string;
        class?: string;
        style?: CSSProperties;
        onClick?: (e: MouseEvent) => void;
        children?: ReactNode;
      };
    }
  }
}

export {};
