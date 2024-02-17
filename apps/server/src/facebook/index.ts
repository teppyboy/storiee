import * as fs from "node:fs";
import { Browser, BrowserContext, Page, chromium, devices } from "playwright";
import logger from "../logger.js";
import { sleep } from "../utils.js";
import FacebookStory from "./story.js";

class Facebook {
	story: FacebookStory;
	#browser: Browser | undefined;
	contexts: BrowserContext[] = [];
	#pageCreationInterval: NodeJS.Timeout | undefined;
	#pages: Page[] = [];
	constructor(browser: Browser | undefined = undefined) {
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
				if (!this.#browser) {
					clearInterval(this.#pageCreationInterval);
					return;
				}
				logger.debug(
					`Creating new page. Current page count: ${this.#pages.length}`,
				);
				if (this.contexts.length === 0) {
					return;
				}
				const context =
					this.contexts[Math.floor(Math.random() * this.contexts.length)];
				const page = await context.newPage();
				this.#pages.push(page);
			}
		}, 100);
	}
	setBrowser(browser: Browser) {
		this.#browser = browser;
		this.#enableAutoPageCreation();
	}
	async loadCookies() {
		if (!this.#browser) {
			throw new Error("Browser is not initialized.");
		}
		for (const file of fs.readdirSync("data/cookies/fb/")) {
			logger.debug(`Loading cookie file: ${file}`);
			const path = `data/cookies/fb/${file}`;
			const cookie = fs.readFileSync(path, "utf8");
			const context = await this.#browser.newContext(
				{...devices["Desktop Edge"]}
			);
			context.addCookies(JSON.parse(cookie));
			this.contexts.push(context);
		}
	}
	async getPage() {
		let page: Page;
		const maybePage = this.#pages.shift();
		if (!maybePage) {
			if (!this.#browser) {
				throw new Error("Browser is not initialized.");
			}
			const context =
				this.contexts[Math.floor(Math.random() * this.contexts.length)];
			page = await context.newPage();
		} else {
			page = maybePage;
		}
		return page;
	}
	async addAccount() {
		logger.info("Adding account...");
		const browser = await chromium.launch({
			headless: false,
		});
		const context = await browser.newContext(
			{...devices["Desktop Edge"]}
		)
		const page = await context.newPage();
		await page.goto("https://www.facebook.com/login/");
		let url = new URL(page.url());
		while (url.pathname !== "/") {
			if (url.pathname.startsWith("/checkpoint")) {
				// The account is locked, we can't continue.
				logger.error("Checkpoint detected, KEKW.");
				throw new Error("Account is locked, can't continue.");
			}
			await sleep(1000);
			url = new URL(page.url());
		}
		logger.info("Saving cookies...");
		const cookies = await context.cookies();
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
