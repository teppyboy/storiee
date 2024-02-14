import * as fs from "node:fs";
import puppeteer from "puppeteer";
import logger from "../logger.js";
import FacebookStory from "./story.js";

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
