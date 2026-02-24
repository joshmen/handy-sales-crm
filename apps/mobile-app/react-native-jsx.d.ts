/**
 * Fix for React 19.1 + React Native 0.81 JSX type incompatibility.
 *
 * @types/react@19.1.x requires JSX.ElementClass to have a `props` property,
 * but React Native class components (View, Text, etc.) use a Constructor mixin
 * pattern that loses the `props` signature.
 *
 * This override relaxes ElementAttributesProperty to accept any object.
 */
import 'react';

declare module 'react' {
  namespace JSX {
    // Relax the props check so RN Constructor<NativeMethods> & typeof XComponent works
    interface ElementAttributesProperty {
      props: any;
    }
    interface ElementChildrenAttribute {
      children: any;
    }
  }
}
