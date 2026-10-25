/* @ts-self-types="./surv_wasm.d.ts" */
import * as wasm from "./surv_wasm_bg.wasm";
import { __wbg_set_wasm } from "./surv_wasm_bg.js";

__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
export {
    runCommandJson
} from "./surv_wasm_bg.js";
