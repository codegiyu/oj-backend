declare module 'react' {
  /**
   * Named export for `import { type ReactNode } from 'react'`.
   * Must not be `unknown` or values passed to `@react-email/render`’s `render()` fail
   * assignability to `React.ReactNode`.
   */
  export type ReactNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | Iterable<ReactNode>
    | object;

  export const Children: {
    toArray(children: ReactNode): ReactNode[];
    map<T>(children: ReactNode, fn: (child: ReactNode, index: number) => T): T[];
  };

  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  export namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
    type Element = unknown;
  }

  interface ReactStatic {
    Children: typeof Children;
  }
  const React: ReactStatic;
  export default React;
}

declare module 'react/jsx-runtime' {
  export const jsx: (type: unknown, props: unknown, key?: string) => unknown;
  export const jsxs: (type: unknown, props: unknown, key?: string) => unknown;
  export const Fragment: unknown;
}
