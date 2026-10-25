/** Vite asset URL import for WebAssembly modules. */
declare module "*.wasm?url" {
  const url: string;
  export default url;
}
