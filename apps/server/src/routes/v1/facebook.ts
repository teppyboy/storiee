import { Context, Hono } from "hono";
import { facebook as fb } from "../../index.js";
import logger from "../../logger.js";

function errorReturnHelper(error: unknown, c: Context) {
	if (error instanceof URIError) {
		return c.json(
			{
				message: "Bad Request",
				data: error.message,
			},
			400,
		);
	}
	if (error instanceof TypeError) {
		return c.json(
			{
				message: "Bad Request",
				data: error.message,
			},
			400,
		);
	}
	if (error instanceof Error) {
		logger.error("An error occurred while processing the request: %o", error);
		return c.json(
			{
				message: "Internal Server Error",
				data: error.message,
			},
			500,
		);
	}
	logger.error("An error occurred while processing the request: %o", error);
	return c.json(
		{
			message: "Internal Server Error",
			data: error,
		},
		500,
	);
}

const facebook = new Hono();
facebook.get("/story/url/:url", async (c) => {
	const url = c.req.param("url");
	let decodedUrl = decodeURIComponent(url);
	if (decodedUrl.startsWith("https:%2F%2F")) {
		decodedUrl = decodeURIComponent(decodedUrl);
	}
	try {
		return c.json({
			message: "OK",
			data: await fb.story.getStoryInfo(decodedUrl, c.req.query("method")),
		});
	} catch (e) {
		return errorReturnHelper(e, c);
	}
});
facebook.post("/story/html", async (c) => {
	const body = await c.req.text();
	try {
		return c.json({
			message: "OK",
			data: fb.story.getStoryInfoFromHTML(atob(body)),
		});
	} catch (e) {
		return errorReturnHelper(e, c);
	}
});
facebook.get("/video/url/:url", async (c) => {
	const url = c.req.param("url");
	let decodedUrl = decodeURIComponent(url);
	if (decodedUrl.startsWith("https:%2F%2F")) {
		decodedUrl = decodeURIComponent(decodedUrl);
	}
	try {
		return c.json({
			message: "OK",
			data: await fb.video.getVideoInfo(decodedUrl, c.req.query("method")),
		});
	} catch (e) {
		return errorReturnHelper(e, c);
	}
});
facebook.post("/video/html", async (c) => {
	const body = await c.req.text();
	try {
		return c.json({
			message: "OK",
			data: fb.video.getVideoInfoFromHTML(atob(body)),
		});
	} catch (e) {
		return errorReturnHelper(e, c);
	}
});
export default facebook;
