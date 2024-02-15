import { Logger, pino } from "pino";

let logger: Logger<never>;
if (process.env.LOG_LEVEL === "debug") {
	logger = pino({
		name: "storiee",
		level: "debug",
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true,
			},
		},
	});
} else {
	logger = pino({
		name: "storiee",
		level: "info",
	});
}

export default logger;
