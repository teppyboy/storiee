import * as fs from "node:fs";
import logger from "../logger.js";
import { getValue, sleep } from "../utils.js";
import puppeteer from "puppeteer";
import { JSDOM } from "jsdom";

class RemoteVideo {
	url: string;
	width: number;
	height: number;
	constructor(url: string, width: number, height: number) {
		this.url = url;
		this.width = width;
		this.height = height;
	}
}

class FacebookStory {
	/**
	 * Gets the video and audio URLs from a Facebook story.
	 *
	 * Note that all videos returned by this function don't have audio, so you'll need to merge them
	 * with the audio URL returned by this function.
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

class Facebook {
	cookies: string[];
	story: FacebookStory;
	constructor() {
		this.cookies = [];
		this.story = new FacebookStory();
		fs.mkdirSync("data/cookies/fb/", { recursive: true });
	}
	loadCookies() {
		for (const file of fs.readdirSync("data/cookies/fb/")) {
			logger.debug(`Loading cookie file: ${file}`);
			const path = `data/cookies/fb/${file}`;
			const cookie = fs.readFileSync(path, "utf8");
			this.cookies.push(JSON.parse(cookie));
		}
	}
	getRandomCookie() {
		const cookie =
			this.cookies[Math.floor(Math.random() * this.cookies.length)];
		return cookie;
	}
	async addAccount() {
		logger.info("Adding account...");
		const browser = await puppeteer.launch({
			headless: false,
			defaultViewport: {
				width: 1280,
				height: 720,
				deviceScaleFactor: 1,
			},
		});
		const page = (await browser.pages())[0];
		await page.goto("https://www.facebook.com/login/");
		await page.waitForNavigation();
		let url = new URL(page.url());
		while (url.pathname !== "/") {
			if (url.pathname.startsWith("/checkpoint")) {
				// The account is locked, we can't continue.
				logger.error("Checkpoint detected, KEKW.");
				throw new Error("Account is locked, can't continue.");
			}
			await page.waitForNavigation();
			url = new URL(page.url());
		}
		logger.info("Saving cookies...");
		const cookies = await page.cookies();
		const fileName = new Date().getTime();
		fs.writeFileSync(
			`data/cookies/fb/${fileName}.json`,
			JSON.stringify(cookies, null, 4),
		);
		await browser.close();
		logger.info(`Account added successfully to ${fileName}.json`);
	}
}

export default Facebook;
