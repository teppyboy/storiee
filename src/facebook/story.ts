import logger from "../logger.js";
import { getValue, sleep } from "../utils.js";
import puppeteer from "puppeteer";
import { JSDOM } from "jsdom";
import { RemoteVideo } from "./classes.js";

class FacebookStory {
	/**
	 * Gets the video and audio URLs from a Facebook story.
	 *
     * There are two methods to get the video and audio URLs:
     * 1. `html` - HTML parsing: This method is faster and more reliable as it can produce
     * better results such as video with audio URLs and also the video resolution. But it 
     * may break in the future if Facebook changes their JSON structure.
	 *
     * 2. `interception` - Request interception: This method is slower and less reliable as
     * it can only produce video without audio URLs (along with the audio URL). This method
     * is more reliable as it doesn't rely on parsing the HTML structure.
     * 
	 * @param page
	 * @param cookie
	 * @param url
	 * @returns
	 */
	async getVideosAndAudioUrls(
		page: puppeteer.Page,
		cookie: string,
		url: string,
		method = "html",
	) {
		await page.setCookie(...(cookie as unknown as puppeteer.CookieParam[]));
		switch (method) {
			case "html": {
				await page.goto(url);
				const source = await page.content();
				return this.getVideosAndAudioUrlsFromHTML(source, url);
			}
			case "interception": {
				await page.setRequestInterception(true);
				let uniqueUrlCount = 0;
				let videos: string[] = [];
				let audio = "";
				page.on("request", (interceptedRequest) => {
					const url = new URL(interceptedRequest.url());
					// logger.debug("Intercepting request: %s", interceptedRequest.url());
					if (url.pathname.endsWith(".mp4")) {
						// logger.debug("'Video' request intercepted: %s", url);
						// logger.debug("Removing 'bytestart' and 'byteend' query parameters...");
						url.searchParams.delete("bytestart");
						url.searchParams.delete("byteend");
						const urlStr = url.toString();
						if (!videos.includes(urlStr) && !audio.includes(urlStr)) {
							uniqueUrlCount++;
						}
						if (videos.length < 3 || (audio !== "" && audio !== urlStr)) {
							videos.push(urlStr);
						} else if (!audio) {
							audio = urlStr;
						}
						// logger.debug("Unique URL count: %d", uniqueUrlCount);
					}
					interceptedRequest.continue();
				});
				await page.goto(url);
				for (const span of await page.$$("span")) {
					const innerHTML = await page.evaluate((el) => el.innerHTML, span);
					// logger.debug("Span innerHTML: %s", innerHTML);
					if (innerHTML.includes("Click to view story")) {
						logger.debug("Clicking to view story...");
						await span.evaluate((el) => el.parentElement?.click());
						break;
					}
				}
				const timeout = setTimeout(() => {
					page.close();
					throw new Error("Timeout: Failed to get video and audio URLs.");
				}, 15000);
				while (uniqueUrlCount < 5) {
					logger.debug("Unique URL count: %d", uniqueUrlCount);
					await sleep(100);
				}
				videos = [...new Set(videos)];
				clearTimeout(timeout);
				page.close();
				return { videos, audio };
			}
			default:
				throw new Error("Invalid method.");
		}
	}
	getVideosAndAudioUrlsFromHTML(source: string, url: string) {
		const dom = new JSDOM(source, {
			url: url,
			runScripts: "dangerously",
		});
		const videos: {
			unified: {
				browser_native_sd_url: string;
				browser_native_hd_url: string;
			};
			muted: RemoteVideo[];
		} = {
			unified: {
				browser_native_sd_url: "",
				browser_native_hd_url: "",
			},
			muted: [],
		};
		let audio = "";
		// const document = page.mainFrame.window.document;
		const document = dom.window.document;
		for (const script of document.querySelectorAll("script")) {
			const length = Number(script.getAttribute("data-content-len"));
			if (script.innerHTML.length !== length) {
				logger.debug("Mismatch length: %d", length);
				logger.debug("Script innerHTML length: %d", script.innerHTML.length);
			}
			try {
				const data = JSON.parse(script.innerHTML);
				// Parse unified stories (videos with audio)
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				const unifiedStories: any = getValue(data, "unified_stories");
				if (unifiedStories) {
					edgeForLoop: for (const edge of unifiedStories.edges) {
						for (const attachment of edge.node.attachments) {
							videos.unified = {
								browser_native_sd_url: attachment.media.browser_native_sd_url,
								browser_native_hd_url: attachment.media.browser_native_sd_url,
							};
							break edgeForLoop;
						}
					}
				}
				// Parse segmented stories (videos without audio, audio)
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				const videoDashes: any = getValue(
					data,
					"all_video_dash_prefetch_representations",
				);
				if (videoDashes) {
					for (const value of videoDashes) {
						for (const representation of value.representations) {
							if (representation.mime_type.includes("video")) {
								const video = new RemoteVideo(
									representation.base_url,
									representation.width,
									representation.height,
								);
								videos.muted.push(video);
							} else {
								audio = representation.base_url;
							}
						}
					}
				}
			} catch (e) {
				logger.debug("Failed to parse script innerHTML: %s", e);
			}
		}
		return { videos, audio };
	}
}

export default FacebookStory;