import * as fs from "node:fs";
import puppeteer from "puppeteer";
import logger from "../logger.js";
import FacebookStory from "./story.js";

class Facebook {
	cookies: string[];
	story: FacebookStory;
	#browser: puppeteer.Browser | undefined;
	#pageCreationInterval: NodeJS.Timeout | undefined;
	#pages: puppeteer.Page[] = [];
	constructor(browser: puppeteer.Browser | undefined = undefined) {
		this.cookies = [];
		this.story = new FacebookStory(this);
		this.#browser = browser;
		if (this.#browser) {
			logger.debug("Creating setInterval to create new pages...");
			this.#enableAutoPageCreation();
		}
		fs.mkdirSync("data/cookies/fb/", { recursive: true });
	}
	#enableAutoPageCreation() {
		if (this.#pageCreationInterval) {
			clearInterval(this.#pageCreationInterval);
			this.#pages = [];
		}
		this.#pageCreationInterval = setInterval(async () => {
			// Hardcoding to 4 for now
			if (this.#pages.length < 4) {
				logger.debug(
					`Creating new page. Current page count: ${this.#pages.length}`,
				);
				if (!this.#browser) {
					return;
				}
				const page = await this.#browser.newPage();
				this.#pages.push(page);
			}
		}, 100);
	}
	setBrowser(browser: puppeteer.Browser) {
		this.#browser = browser;
		this.#enableAutoPageCreation();
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
	async getPage() {
		let page: puppeteer.Page;
		const maybePage = this.#pages.shift();
		if (!maybePage) {
			if (!this.#browser) {
				throw new Error("Browser is not initialized.");
			}
			page = await this.#browser.newPage();
		} else {
			page = maybePage;
		}
		const cookie = this.getRandomCookie();
		await page.setCookie(...(cookie as unknown as puppeteer.CookieParam[]));
		return page;
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
