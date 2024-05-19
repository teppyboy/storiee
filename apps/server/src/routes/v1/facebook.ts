import { Elysia, t } from "elysia";
import { facebook as fb } from "../../index.js";

export const facebook: Elysia = new Elysia()
	.get(
		"/facebook/story/url/:url",
		async ({ query, params: url }) => {
			let decodedUrl = decodeURIComponent(url.url);
			if (decodedUrl.startsWith("https:%2F%2Fwww.facebook.com")) {
				decodedUrl = decodeURIComponent(decodedUrl);
			}
			return {
				message: "OK",
				data: await fb.story.getStoryInfo(decodedUrl, query.method),
			};
		},
		{
			query: t.Object({
				method: t.Optional(
					t.String({
						enum: ["html", "intercept"],
						error: "Invalid method. Must be 'html' or 'intercept'",
					}),
				),
			}),
		},
	)
	// Workaround for CORS preflight request
	// See https://github.com/elysiajs/elysia-cors/issues/48
	.options("/facebook/story/html", async ({ set, request }) => {
		set.headers["Access-Control-Allow-Headers"] =
			request.headers.get("Access-Control-Request-Headers") ?? "";
	})
	.post(
		"/facebook/story/html",
		({ body }) => {
			return {
				message: "OK",
				data: fb.story.getStoryInfoFromHTML(atob(body)),
			};
		},
		{
			body: t.String(),
		},
	)
	.get(
		"/facebook/video/url/:url",
		async ({ query, params: url }) => {
			let decodedUrl = decodeURIComponent(url.url);
			if (decodedUrl.startsWith("https:%2F%2Fwww.facebook.com")) {
				decodedUrl = decodeURIComponent(decodedUrl);
			}
			return {
				message: "OK",
				data: await fb.video.getVideoInfo(decodedUrl, query.method),
			};
		},
		{
			query: t.Object({
				method: t.Optional(
					t.String({
						enum: ["html", "intercept"],
						error: "Invalid method. Must be 'html' or 'intercept'",
					}),
				),
			}),
		},
	);
