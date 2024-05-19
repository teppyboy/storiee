import { JSDOM } from "jsdom";
import logger from "../logger.js";
import { findValue, getValue, getValueAll, sleep } from "../utils.js";
import { RemoteVideo } from "./classes.js";
import Facebook from "./index.js";

class FacebookVideo {
	#facebook: Facebook;
	constructor(facebook: Facebook) {
		this.#facebook = facebook;
	}
	async getVideoInfoByIntercept(url: string) {
		const page = await this.#facebook.getPage();
		// Variables
		const video: {
			unified: undefined | {
				browser_native_sd_url: string;
				browser_native_hd_url: string;
			},
			muted: RemoteVideo[];
			audio: string | null;
		} = {
			unified: undefined,
			muted: [],
			audio: null,
		};

		async function viewVideo() {
			logger.debug("Viewing video...");
			const viewVideoBtn = page.locator("[role=presentation]").first();
			if (viewVideoBtn) {
				await viewVideoBtn.click({ force: true });
			}
		}

		logger.debug("Enabling request interception...");
		// Fix TypeScript being annoying
		const videoBandwidths = {
			data: "",
		};
		function getBandwidth(fileName: string): number | undefined {
			// logger.debug(`File name: ${fileName}`);
			for (const line of videoBandwidths.data.split(";")) {
				// logger.debug(`Line: ${line}`);
				const [key, value] = line.split("=", 2);
				// logger.debug(`Key: ${key}`);
				// logger.debug(`Value: ${value}`);
				if (key === fileName) {
					return parseInt(value);
				}
			}
		}
		let currentHeight: number | null = null;
		page.on("request", (interceptedRequest) => {
			const url = new URL(interceptedRequest.url());
			// logger.debug("Intercepting request: %s", interceptedRequest.url());
			if (url.pathname.endsWith(".mp4")) {
				url.searchParams.delete("bytestart");
				const fileName = url.pathname.split("/").pop() as string;
				const byteEnd = parseInt(url.searchParams.get("byteend") as string);
				logger.debug(`Byte end: ${byteEnd}`);
				const currentBandwidth = getBandwidth(fileName);
				if (!currentBandwidth) {
					videoBandwidths.data += `${fileName}=${byteEnd};`;
				} else {
					if (byteEnd > currentBandwidth) {
						videoBandwidths.data = videoBandwidths.data.replace(
							`${fileName}=${currentBandwidth};`,
							`${fileName}=${byteEnd};`,
						);
					}
				}
				logger.debug(`Bandwidth: ${currentBandwidth}`);
				url.searchParams.delete("byteend");
				// It will not be null
				const efg = Buffer.from(
					url.searchParams.get("efg") as string,
					"base64",
				).toString("utf-8");
				const isVideo =
					efg.includes("video") ||
					efg.includes("vp9") ||
					efg.includes("avc");
				const isAudio = efg.includes("audio");
				let width = 0;
				let height = 0;
				const efgJson = JSON.parse(efg);
				if (efgJson.vencode_tag.endsWith("p")) {
					// In mobile we do 720x1280 instead of 1280x720 most of the time.
					// The format is {"vencode_tag":"dash_vp9-basic-gen2_720p"}
					try {
						width = parseInt(
							(
								(efgJson.vencode_tag.split("_") as string[]).pop() as string
							).split("p")[0],
						);
						height = (width / 9) * 16;
					} catch (e) {
						logger.warn(`Failed to parse width and height: ${e}`);
						if (currentHeight) {
							height = currentHeight;
							width = (height / 16) * 9;
						}
					}
				}
				logger.debug(`EFG: ${efg}`);
				logger.debug(`Is video: ${isVideo}`);
				logger.debug(`Is audio: ${isAudio}`);
				const urlStr = url.toString();
				if (!findValue(video, urlStr)) {
					if (isVideo) {
						video.muted.push(
							new RemoteVideo(urlStr, width, height, 0, false, null),
						);
					} else if (isAudio) {
						video.audio = urlStr;
					}
				}
			}
		});

		await page.goto(url);
		await sleep(10);
		await viewVideo();
		// Change resolution
		await page.locator("[aria-label=Settings]").first()?.click();
		await sleep(10);
		// biome-ignore lint/suspicious/noImplicitAnyLet: elm is ElementHandleForTag<"div">
		let parentElement;
		for (const element of await page.locator("div").all()) {
			if ((await element.innerHTML()) === "Quality") {
				// Yeah exactly 5 times.
				parentElement = await element.evaluate(
					(e) =>
						e.parentElement?.parentElement?.parentElement?.parentElement
							?.parentElement,
				);
				await element.evaluate((e) => e.parentElement?.click());
				break;
			}
		}
		await sleep(10);
		logger.debug(`Parent element: ${parentElement}`);
		if (parentElement) {
			try {
				logger.debug(
					`Parent element first child: ${parentElement.children[0]}`,
				);
				const qualityElement =
					parentElement.children[0].children[0].children[1];
				logger.debug(`Quality element: ${qualityElement}`);
				if (qualityElement) {
					for (
						let i = 1;
						i < (qualityElement.children.length as number);
						i++
					) {
						// It SHOULD work.
						const qualityBtn = qualityElement.children[i].children[0];
						currentHeight = parseInt(
							qualityBtn.children[1].innerHTML.slice(0, -1),
						);
						(qualityBtn as HTMLElement).click();
						await sleep(10);
					}
				} else {
					logger.warn("Failed to get quality element.");
				}
			} catch (e) {
				logger.warn(`Failed to change resolution: ${e}`);
			}
		}
		// Cleanup
		await page.close();

		// Fix variables
		for (const vid of video.muted) {
			try {
				const bandwidth = getBandwidth(
					(vid.url.split("/").pop() as string).split("?").shift() as string,
				) as number;
				// logger.debug(bandwidth);
				vid.bandwidth = bandwidth;
				logger.debug(`Bandwidth: ${vid.bandwidth}`);
			} catch (e) {
				logger.error(`Failed to get bandwidth: ${e}`);
			}
		}
		// Finally return
		return { video };
	} 
	/**
	 * Gets the video information from the URL.
	 *
	 * There are two methods here:
	 * 1. `html` - HTML parsing: This method is faster and more reliable as 
	 * it can produce better results such as video with audio URLs and also the video resolution. 
	 * A major drawback is that it may break in the future if Facebook changes their JSON structure.
	 *
	 * 2. `intercept` - Request interception: This method is slower but more reliable because
	 * it doesn't depend on the JSON structure entirely (it still does slightly for extra
	 * information such as video resolution). But beware that results may not be as good as
	 * the `html` method, and this method doesn't work with Chromium (due to the lack of video
	 * codecs)
	 *
	 * @param url
	 * @param method
	 * @returns object
	 */
	async getVideoInfo(url: string, method = "html"): Promise<{
		video: {
			unified: undefined | {
                browser_native_sd_url: string;
                browser_native_hd_url: string;
            },
			muted: RemoteVideo[],
			audio: string | null;
		},
	}> {
		logger.debug("Video URL: %s", url);
		switch (method) {
			case "html": {
				const page = await this.#facebook.getPage();
				await page.goto(url);
				const source = await page.content();
				await page.close();
				return this.getVideoInfoFromHTML(source);
			}
			case "intercept": {
				return await this.getVideoInfoByIntercept(url);
			}
			default:
				throw new Error("Invalid method.");
		}
	}
	getVideoInfoFromHTML(source: string) {
		const dom = new JSDOM(source, {
			runScripts: "outside-only",
		});
		const video: {
			unified: {
				browser_native_sd_url: string;
				browser_native_hd_url: string;
			};
			muted: RemoteVideo[];
			audio: string | null;
		} = {
			unified: {
				browser_native_sd_url: "",
				browser_native_hd_url: "",
			},
			muted: [],
			audio: null,
		};
		const thumbnails: string[] = [];
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
				const attachmentsArr: any = getValueAll(data, "attachments");
				if (attachmentsArr.length > 0) {
					logger.debug(`Attachment length: ${attachmentsArr.length}`);
					// fs.writeFileSync("a.json", script.innerHTML);
					for (const [i, attachments] of attachmentsArr.entries()) {
						logger.debug("Attachments: %o", attachments);
						logger.debug("Attachment URL: %s", attachments[0].url);
						if (attachments[0].url === undefined) {
							logger.debug(`Index: ${i}`);
							if (!video.unified.browser_native_hd_url) {
								video.unified = {
									browser_native_sd_url:
										attachments[0].media.browser_native_sd_url,
									browser_native_hd_url:
										attachments[0].media.browser_native_hd_url,
								};
							}
							// Parse thumbnails
							try {
								thumbnails[i] =
									attachments[0].media.preferred_thumbnail.image.url;
							} catch (e) {
								logger.warn(`Failed to parse thumbnail: ${e}`);
							}
						}
					}
				}
				// Parse segmented stories (videos without audio, audio)
				// biome-ignore lint/suspicious/noExplicitAny: An object here
				const videoDashes: any = getValue(
					data,
					"all_video_dash_prefetch_representations",
				);
				if (videoDashes) {
					// Used for debugging only :skull:
					// fs.writeFileSync("a.json", script.innerHTML);
					for (const [i, videoDash] of videoDashes.entries()) {
						logger.debug("Video dash: %o", videoDash);
						for (const representation of videoDash.representations) {
							logger.debug("Representation: %o", representation);
							if (representation.mime_type.includes("video")) {
								const vid = new RemoteVideo(
									representation.base_url,
									representation.width,
									representation.height,
									representation.bandwidth,
									false,
									thumbnails[i] || null,
								);
								video.muted.push(vid);
							} else {
								video.audio = representation.base_url;
							}
						}
					}
					break;
				}
			} catch (e) {
				logger.debug("Failed to parse script innerHTML: %s", e);
			}
		}
		// Deduplicate
		const newMutedVideos: RemoteVideo[] = [];
		for (const vid of video.muted) {
			if (!findValue(newMutedVideos, vid.url)) {
				newMutedVideos.push(vid);
			}
		}
		video.muted = newMutedVideos;
		return { video };
	}
}

export default FacebookVideo;
