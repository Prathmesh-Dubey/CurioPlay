import type { JSX as ReactJSX } from 'react';

// React 19 removed the global JSX namespace; the motion-primitives sources still reference it.
declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}
