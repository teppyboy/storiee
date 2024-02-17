import * as fs from "node:fs";
import "@bogeychan/elysia-polyfills/node/index.js";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { chromium } from "playwright";
import * as constants from "./constants.js";
import Facebook from "./facebook/index.js";
import logger from "./logger.js";
import api from "./routes/index.js";
import { sleep } from "./utils.js";

console.log(`Storiee Server - v${constants.VERSION}`);
const facebook = new Facebook();

// Create a data directory if it doesn't exist
fs.mkdirSync("data/cookies/", { recursive: true });

for (const arg of process.argv) {
	if (arg === "add-account") {
		try {
			await facebook.addAccount();
		} catch (e) {
			logger.error(`Failed to add account: ${e}`);
			process.exit(1);
		}
		process.exit(0);
	}
}

logger.info("Initializing components...");
logger.info("Initializing browser...");
// Launch the browser and open a new blank page
const browser = await chromium.launch({
	headless: process.env.HEADLESS !== "false" ? true : false,
	channel: "msedge-beta",
});

facebook.setBrowser(browser);
// Load cookies
logger.info("Loading cookies...");
await facebook.loadCookies();
if (facebook.contexts.length > 0) {
	logger.info(`Loaded ${facebook.contexts.length} instances`);
} else {
	logger.error("No instances loaded.");
	logger.error(
		"Please login to your account to load cookies with the 'add-account' command",
	);
	logger.error(
		"Keep in mind using 'add-account' will require you to run Chrome without headless mode",
	);
	process.exit(1);
}

// Let the browser start up
await sleep(1000);

logger.info("Starting server...");
const app = new Elysia()
	.use(
		cors({
			origin: true,
		}),
	)
	.use(api);
app.listen(
	{
		port: 8080,
		host: "0.0.0.0",
	},
	(data) => {
		logger.info(`Server started on http://${data.hostname}:${data.port}`);
	},
);

// For our server.
export { facebook };

export type App = typeof app;
