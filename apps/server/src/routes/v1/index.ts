import { Elysia } from "elysia";
import { facebook } from "./facebook.js";

const apiV1 = new Elysia({ prefix: "/api/v1" }).use(facebook);

export default apiV1;
export type APIv1 = typeof apiV1;
