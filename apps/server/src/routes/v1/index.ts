import { Elysia } from "elysia";
import { facebook } from "./facebook.js";

const v1 = new Elysia({ prefix: "/v1" }).use(facebook);

export default v1;
export type V1 = typeof v1;
