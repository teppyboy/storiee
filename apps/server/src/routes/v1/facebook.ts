import { Hono } from 'hono';
import { facebook as fb } from "../../index.js";

const facebook = new Hono();
facebook.get("/story/url/:url", async (c) => {
	const url = c.req.param("url");
	let decodedUrl = decodeURIComponent(url);
	if (decodedUrl.startsWith("https:%2F%2Fwww.facebook.com")) {
		decodedUrl = decodeURIComponent(decodedUrl);
	}
	return c.json({
		message: "OK",
		data: await fb.story.getStoryInfo(decodedUrl, c.req.query("method")),
	});
});
facebook.post("/story/html", async (c) => {
	const body = await c.req.text();
	return c.json({
		message: "OK",
		data: fb.story.getStoryInfoFromHTML(atob(body)),
	});
});
facebook.get("/video/url/:url", async (c) => {
	const url = c.req.param("url");
	let decodedUrl = decodeURIComponent(url);
	if (decodedUrl.startsWith("https:%2F%2Fwww.facebook.com")) {
		decodedUrl = decodeURIComponent(decodedUrl);
	}
	return c.json({
		message: "OK",
		data: await fb.video.getVideoInfo(decodedUrl, c.req.query("method")),
	});
});
facebook.post("/video/html", async (c) => {
	const body = await c.req.text();
	return c.json({
		message: "OK",
		data: fb.video.getVideoInfoFromHTML(atob(body)),
	});
});
export default facebook;
