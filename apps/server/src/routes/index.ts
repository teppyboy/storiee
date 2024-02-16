import { Elysia } from "elysia";
import v1 from "./v1/index.js";

const api = new Elysia({ prefix: "/api" })
	.onError(({ code, error, set }) => {
		switch (code) {
			case "NOT_FOUND":
				set.status = 404;
				return {
					error: error.message,
					code: error.code,
					message: "The requested resource was not found",
				};
			default:
				set.status = 500;
				return {
					error: error.message,
					code: null,
					message: "An internal server error occurred",
				};
		}
	})
	.use(v1);

export default api;
export type API = typeof api;
export const GET = api.handle;
export const POST = api.handle;
