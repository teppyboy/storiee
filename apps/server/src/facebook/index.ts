import * as fs from "node:fs";
import { type Browser, type BrowserContext, type Page, chromium, devices } from "playwright";
import logger from "../logger.js";
import { sleep } from "../utils.js";
import FacebookStory from "./story.js";
import FacebookVideo from "./video.js";

class Facebook {
	story: FacebookStory;
	video: FacebookVideo;
	#browser: Browser | undefined;
	#browserChannel: string;
	contexts: {
		context: BrowserContext,
		cookieFile: string,
	}[] = [];
	constructor(browser: Browser | undefined = undefined) {
		this.story = new FacebookStory(this);
		this.video = new FacebookVideo(this);
		this.#browser = browser;
		this.#browserChannel = process.env.BROWSER_CHANNEL || "chrome";
		fs.mkdirSync("data/cookies/fb/", { recursive: true });
	}
	setBrowser(browser: Browser) {
		this.#browser = browser;
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
			const page = await context.newPage();
			await page.goto("https://www.facebook.com/");
			if (await this.isAccountLoggedOut(page)) {
				logger.warn(`Account in ${file} is logged out.`);
				logger.info("Trying to re-login...");
				try {
					await this.reloginAccountHeadless(page, {
						context,
						cookieFile: file,
					});
				} catch (e) {
					logger.error(`Failed to re-login account: ${e}`);
					page.close();
					continue;
				}
			}
			page.close();
			this.contexts.push({
				context: context,
				cookieFile: file,
			});
		}
	}
	async getPage() {
		if (!this.#browser) {
			throw new Error("Browser is not initialized.");
		}
		const contextData =
			this.contexts[Math.floor(Math.random() * this.contexts.length)];
		const page = await contextData.context.newPage();
		if (await this.isAccountLoggedOut(page)) {
			logger.warn(
				`Account in ${contextData.cookieFile} is logged out, trying to re-login...`,
			);
			await this.reloginAccountHeadless(page, contextData);
		}
		return page;
	}
	async isAccountLoggedOut(page: Page) {
		try {
			return await page.$(".UIPage_LoggedOut");
		} catch (e) {
			logger.warn(`Error while getting logged out element: ${e}`);
			return true;
		}
	}
	async reloginAccountHeadless(page: Page, contextData: {
		context: BrowserContext,
		cookieFile: string,
	}) {
		const loginButton = await page.$('a[href^="/login"]');
		if (!loginButton) {
			throw new Error("Login button not found.");
		}
		await loginButton.click();
		while (await this.isAccountLoggedOut(page)) {
			await sleep(1000);
		}
		await this.#saveLoginCookies(page, contextData.context, contextData.cookieFile);
	}
	async addAccount() {
		logger.info("Adding account...");
		const browser = await chromium.launch({
			headless: false,
			channel: this.#browserChannel,
		});
		const context = await browser.newContext(
			{...devices["Desktop Edge"]}
		)
		const page = await context.newPage();
		await page.goto("https://www.facebook.com/login/");
		const fileName = new Date().getTime().toString();
		await this.#saveLoginCookies(page, context, fileName);
		await browser.close();
		logger.info(`Account added successfully to ${fileName}.json`);
	}
	async #saveLoginCookies(page: Page, context: BrowserContext, cookieFile: string) {
		let url = new URL(page.url());
		while (url.pathname !== "/") {
			if (url.pathname.startsWith("/checkpoint")) {
				// The account is locked, we can't continue.
				logger.error("Checkpoint detected, KEKW.");
				throw new Error("Account is locked, can't continue.");
			}
			await sleep(250);
			url = new URL(page.url());
		}
		logger.info("Saving cookies...");
		const cookies = await context.cookies();
		fs.writeFileSync(
			`data/cookies/fb/${cookieFile}`,
			JSON.stringify(cookies, null, 4),
		);
	}
	// Headful functions.
	async openPage(cookieFile: string) {
		logger.info(`Using cookie file: ${cookieFile}`);
		if (!fs.existsSync(`data/cookies/fb/${cookieFile}`)) {
			throw new Error("Cookie file does not exist.");
		}
		logger.info("Launching browser with specified cookie file...");
		const browser = await chromium.launch({
			headless: false,
			channel: this.#browserChannel,
		});
		const context = await browser.newContext(
			{...devices["Desktop Edge"]}
		)
		context.addCookies(
			JSON.parse(
				fs.readFileSync(`data/cookies/fb/${cookieFile}`, "utf8"),
			),
		);
		logger.warn("Please use Ctrl + C to close the browser manually.");
		await context.newPage();
		while (true) {
			await sleep(1000);
		}
	}
	async reloginAccount(cookieFile: string) {
		logger.info(`Validating account with cookie file: ${cookieFile}`);
		if (!fs.existsSync(`data/cookies/fb/${cookieFile}`)) {
			throw new Error("Cookie file does not exist.");
		}
		logger.info("Launching browser with specified cookie file...");
		const browser = await chromium.launch({
			headless: false,
			channel: this.#browserChannel,
		});
		const context = await browser.newContext(
			{...devices["Desktop Edge"]}
		)
		context.addCookies(
			JSON.parse(
				fs.readFileSync(`data/cookies/fb/${cookieFile}`, "utf8"),
			),
		);
		const page = await context.newPage();
		await page.goto("https://www.facebook.com/");
		if (!await this.isAccountLoggedOut(page)) {
			logger.info("Account is already logged in.");
			return;
		}
		logger.warn("Account is logged out, please login again...");
		while (await this.isAccountLoggedOut(page)) {
			await sleep(1000);
		}
		await this.#saveLoginCookies(page, context, cookieFile);
		await browser.close();
		logger.info(`Account added successfully to ${cookieFile}`);
	}
}

export default Facebook;
