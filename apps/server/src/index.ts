import * as fs from "node:fs";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { chromium } from "playwright";
import * as constants from "./constants.js";
import Facebook from "./facebook/index.js";
import logger from "./logger.js";
import api from "./routes/index.js";
import { sleep } from "./utils.js";

console.log(
	`Storiee (server) v${constants.VERSION} - https://github.com/teppyboy/storiee`,
);
const facebook = new Facebook();

// Create a data directory if it doesn't exist
fs.mkdirSync("data/cookies/", { recursive: true });

for (const [i, arg] of process.argv.entries()) {
	switch (arg) {
		// biome-ignore lint/suspicious/noFallthroughSwitchClause: process.exit(0)
		case "add-account":
			try {
				await facebook.addAccount();
			} catch (e) {
				logger.error(`Failed to add account: ${e}`);
				process.exit(1);
			}
			process.exit(0);
		// biome-ignore lint/suspicious/noFallthroughSwitchClause: process.exit(0)
		case "relogin-account":
			try {
				await facebook.reloginAccountHeadful(process.argv[i + 1]);
			} catch (e) {
				logger.error(`Failed to re-login account: ${e}`);
				process.exit(1);
			}
			process.exit(0);
		case "launch-browser":
			try {
				await facebook.openPage(process.argv[i + 1]);
			} catch (e) {
				logger.error(`Failed to launch browser: ${e}`);
				process.exit(1);
			}
			process.exit(0);
	}
}

logger.info("Initializing components...");
const browserChannel = process.env.BROWSER_CHANNEL || "chrome";
const browserHeadless = process.env.HEADLESS !== "false" ? true : false;
logger.info(
	`Initializing browser (channel: ${browserChannel}) (headless: ${browserHeadless})...`,
);
// Launch the browser and open a new blank page
const browser = await chromium.launch({
	headless: browserHeadless,
	channel: browserChannel,
});
facebook.setBrowser(browser);

// Load cookies
logger.info("Loading cookies...");
await facebook.loadCookies();
if (facebook.contexts.length > 0) {
	logger.info(`Loaded ${facebook.contexts.length} instances.`);
} else {
	logger.error("No instances loaded.");
	logger.error(
		"Please login to your account to load cookies with the 'add-account' command.",
	);
	logger.error(
		"Keep in mind using 'add-account' will require you to run the browser without headless mode.",
	);
	process.exit(1);
}

// Let the browser start up
await sleep(1000);

const port = Number.parseInt(process.env.SERVER_PORT as string) || 8080;
const host = process.env.SERVER_HOST || "127.0.0.1";

logger.info(`Starting server on ${host}:${port}...`);
const app = new Hono();
app.get("/", (c) => c.text("Hello Node.js!"));
app.use(cors());
app.route("/api", api);
serve({
	fetch: app.fetch,
	port: port,
	hostname: host,
});
export { facebook };

// For our server and Next.js
export type App = typeof app;
