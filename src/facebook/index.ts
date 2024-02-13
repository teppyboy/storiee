import * as fs from "node:fs";
import logger from "../logger.js";
import { sleep } from "../utils.js";
import puppeteer from "puppeteer";
import { Browser } from "happy-dom";

class FacebookStory {
	_hdBrowser: Browser;
	constructor() {
		this._hdBrowser = new Browser();
	}
	async getVideosAndAudioUrls(page: puppeteer.Page, cookie: string, url: string) {
		await page.setRequestInterception(true);
		await page.setCookie(...cookie as unknown as puppeteer.CookieParam[]);
		let uniqueUrlCount = 0;
		let videos: string[] = [];
		let audio = "";
		page.on('request', interceptedRequest => {
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
	async getVideosAndAudioUrlsFromSource(source: string) {
		const page = this._hdBrowser.newPage();
		page.content = source;
		const document = page.mainFrame.window.document;
		for (const script of document.querySelectorAll("script")) {
			script.innerHTML
		}
		const videos: string[] = [];
		const audio: string = "";
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
		const cookie = this.cookies[Math.floor(Math.random() * this.cookies.length)];
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
