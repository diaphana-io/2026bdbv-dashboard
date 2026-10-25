/** Vite asset URL import for WebAssembly modules. */
declare module "*.wasm?url" {
  const url: string;
  export default url;
}

/** Cloudflare Vite plugin / workerd: compiled WebAssembly.Module. */
declare module "*.wasm?module" {
  const mod: WebAssembly.Module;
  export default mod;
}
