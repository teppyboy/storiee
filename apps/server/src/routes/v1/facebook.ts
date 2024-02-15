import { Elysia, t } from "elysia";
import { facebook as fb } from "../../index.js";

export const facebook: Elysia = new Elysia().get(
	"/facebook/story/url/:url",
	async ({ set, query, params: url }) => {
		return {
			message: "OK",
			data: await fb.story.getVideosAndAudioUrls(
				decodeURIComponent(url.url),
				query.method,
			),
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
