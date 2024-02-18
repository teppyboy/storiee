"use client";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSWR from "swr";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const fetcher = (...args: any[]) => fetch(...args).then((res) => res.json());

export default function StoryDownloadResult({
	videoUrl,
	method,
	removeResult,
}) {
	// Smartest way to handle the download :nerd:
	console.log("Downloading story", videoUrl, method);
	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
	const { data, error, isLoading } = useSWR(
		`${apiUrl}/api/v1/facebook/video/url/${encodeURIComponent(
			videoUrl,
		)}?method=${method}`,
		fetcher,
	);
	function handleRemoveResult() {
		removeResult();
	}
	const removeResultButton = (
		<div
			className="w-full flex justify-end m-0 p-0"
			id={Math.random().toString(36)}
		>
			<Button
				variant="outline"
				className="text-1.5xl"
				onClick={handleRemoveResult}
			>
				X
			</Button>
		</div>
	);
	if (error) {
		return (
			<div>
				<Card className="w mt-4">
					<CardHeader>
						<div className="flex flex-row">
							<CardTitle>Result</CardTitle>
							{removeResultButton}
						</div>
					</CardHeader>
					<CardContent>Failed to download story information.</CardContent>
				</Card>
			</div>
		);
	}
	if (isLoading) {
		return (
			<div>
				<Card className="w mt-4">
					<CardHeader>
						<CardTitle>Downloading story information...</CardTitle>
					</CardHeader>
					<CardContent className="text-opacity-80">
						The process will take a few seconds, please wait.
						<br />
						<br />
						If you are using "Intercept" method then it'll take a bit longer.
					</CardContent>
				</Card>
			</div>
		);
	}
	// Data parsing time
	if (data.error) {
		return (
			<div>
				<Card className="w mt-4">
					<CardHeader>
						<div className="flex flex-row">
							<CardTitle>Result</CardTitle>
							{removeResultButton}
						</div>
					</CardHeader>
					<CardContent>
						An error occurred while downloading the story information:{" "}
						<code>{data.message}</code>
						<br />
						Error code: <code>{data.error}</code>
					</CardContent>
				</Card>
			</div>
		);
	}
	const videoData = data.data;
	if (videoData.video.videos.length === 0) {
		return (
			<div>
				<Card className="w mt-4">
					<CardHeader>
						<div className="flex flex-row">
							<CardTitle>Result</CardTitle>
							{removeResultButton}
						</div>
					</CardHeader>
					<CardContent>
						Successfully fetch video information, but there isn't any video 
						in the URL you provided.
					</CardContent>
				</Card>
			</div>
		);
	}
	const tabsTriggers = [];
	const tabsContents = [];
	const content = [];
	if (method === "html") {
		const videoButtons = [];
		for (const video of videoData.video.videos.muted) {
			videoButtons.push(
				<Button
					className="mr-2 mb-2"
					onClick={() => window.open(video.url, "_blank")}
				>
					{video.height}x{video.width}
				</Button>,
			);
		}
		const vidWithoutAudios = [];
		if (videoButtons.length > 0) {
			vidWithoutAudios.push(
				<div>
					<h4 className="mb-2">Videos WITHOUT audio</h4>
					{videoButtons}
					<Button onClick={() => window.open(videoData.video.audio, "_blank")}>
						Audio only
					</Button>
				</div>,
			);
		}
		if (
			videoData.video.videos.muted.length === 0 &&
			!videoData.video.videos.unified.browser_native_hd_url
		) {
			content.push(<div>The video url is probably not a video.</div>);
		} else {
			const vidWithAudios = [];
			if (videoData.video.videos.unified.browser_native_sd_url) {
				vidWithAudios.push(
					<div className="my-2">
						<h4 className="mb-2">Videos with audio</h4>
						<Button
							className="mr-2"
							onClick={() =>
								window.open(
									videoData.video.videos.unified.browser_native_sd_url,
									"_blank",
								)
							}
						>
							SD
						</Button>
						<Button
							onClick={() =>
								window.open(
									videoData.video.videos.unified.browser_native_hd_url,
									"_blank",
								)
							}
						>
							HD
						</Button>
					</div>,
				);
			}
			content.push(<div>
				{vidWithAudios}
				{vidWithoutAudios}
			</div>)
		}
	} else {
		const videoButtons = [];
		for (const video of videoData.video.videos) {
			let widthHeight = "";
			if (video.height === 0) {
				widthHeight = `${video.bandwidth}`;
			} else {
				widthHeight = `${video.height}x${video.width}`;
			}
			videoButtons.push(
				<Button
					className="mr-2 mb-2"
					onClick={() => window.open(video.url, "_blank")}
				>
					{widthHeight}
				</Button>,
			);
		}
		if (videoData.video.videos.length === 0) {
			content.push(
				<div>The video url is probably not a video.</div>
			);
		} else {
			content.push(
				<div>
					<h4 className="mb-2">Videos WITHOUT audio</h4>
					{videoButtons}
					<Button onClick={() => window.open(videoData.video.audio, "_blank")}>
						Audio only
					</Button>
				</div>,
			);
		}
	}
	// Render story information
	return (
		<Card className="w mt-4">
			<CardHeader>
				<div className="flex flex-row">
					<CardTitle>Result</CardTitle>
					{removeResultButton}
				</div>
				<CardDescription className="text-wrap">
					<div className="text-balance">
						<a href={videoUrl} target="_blank" rel="noreferrer">
							Click here to open the video in Facebook.
						</a>
					</div>
				</CardDescription>
			</CardHeader>
			<CardContent>
				{content}
			</CardContent>
			<CardFooter>
				Like this project? Consider supporting me on Patreon or Ko-fi!
			</CardFooter>
		</Card>
	);
}
