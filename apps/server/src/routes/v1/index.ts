import { Hono } from "hono";
import facebook from "./facebook.js";

const v1 = new Hono();
v1.route("/facebook", facebook);

export default v1;
export type V1 = typeof v1;
