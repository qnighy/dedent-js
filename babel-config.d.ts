declare module "@babel/core" {
  export interface TransformOptions {
    targets?: string | string[] | Record<string, string> | undefined;
  }
}
export {};
