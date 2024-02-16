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

export default function StoryDownloadResult({ storyUrl, method, removeResult }) {
	// Smartest way to handle the download :nerd:
	console.log("Downloading story", storyUrl, method);
	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
	const { data, error, isLoading } = useSWR(
		`${apiUrl}/api/v1/facebook/story/url/${encodeURIComponent(
			storyUrl,
		)}?method=${method}`,
		fetcher,
	);
	function handleRemoveResult() {
		removeResult();
	}
	const removeResultButton = (
		<div className="w-full flex justify-end m-0 p-0">
			<Button variant="outline" className="text-1.5xl" onClick={handleRemoveResult}>
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
					<CardContent>Failed to download story.</CardContent>
					<CardFooter>
						{/* <Button onClick={handleDownload}>Download</Button> */}
					</CardFooter>
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
					<CardContent>
						The process will take a few seconds, please wait.
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
	const storyData = data.data;
	const tabsTriggers = [];
	const tabsContents = [];
	if (method === "html") {
		for (const [i, story] of storyData.stories.entries()) {
			const videoButtons = [];
			const audios = [];
			if (story.audio) {
				audios.push(
					<Button onClick={() => window.open(story.audio, "_blank")}>
						Audio only
					</Button>,
				);
			}
			for (const video of story.videos.muted) {
				videoButtons.push(
					<Button
						className="mr-2 mb-2"
						onClick={() => window.open(video.url, "_blank")}
					>
						{video.height}x{video.width}
					</Button>,
				);
			}
			tabsTriggers.push(
				<TabsTrigger value={i.toString()}>Story {i + 1}</TabsTrigger>,
			);
			if (story.videos.length === 0) {
				tabsContents.push(
					<TabsContent value={i.toString()}>
						<div>The story is probably not a video story.</div>
					</TabsContent>,
				);
			} else {
				tabsContents.push(
					<TabsContent value={i.toString()}>
						<div className="my-2">
							<h4 className="mb-2">Videos with audio</h4>
							<Button
								className="mr-2"
								onClick={() =>
									window.open(
										story.videos.unified.browser_native_sd_url,
										"_blank",
									)
								}
							>
								SD
							</Button>
							<Button
								onClick={() =>
									window.open(
										story.videos.unified.browser_native_hd_url,
										"_blank",
									)
								}
							>
								HD
							</Button>
						</div>
						<div>
							<h4 className="mb-2">Videos WITHOUT audio</h4>
							{videoButtons}
							{audios}
						</div>
					</TabsContent>,
				);
			}
		}
	} else {
		for (const [i, story] of storyData.stories.entries()) {
			const videoButtons = [];
			const audios = [];
			if (story.audio) {
				audios.push(
					<Button onClick={() => window.open(story.audio, "_blank")}>
						Audio only
					</Button>,
				);
			}
			for (const video of story.videos) {
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
			tabsTriggers.push(
				<TabsTrigger value={i.toString()}>Story {i + 1}</TabsTrigger>,
			);
			if (story.videos.length === 0) {
				tabsContents.push(
					<TabsContent value={i.toString()}>
						<div>The story is probably not a video story.</div>
					</TabsContent>,
				);
			} else {
				tabsContents.push(
					<TabsContent value={i.toString()}>
						<div>
							<h4 className="mb-2">Videos WITHOUT audio</h4>
							{videoButtons}
							{audios}
						</div>
					</TabsContent>,
				);
			}
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
				<CardDescription>
					Successfully fetch story information, click the story you want to
					download.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="account" className="w">
					<TabsList>{tabsTriggers}</TabsList>
					{tabsContents}
				</Tabs>
			</CardContent>
			<CardFooter>
				Like this project? Consider supporting me on Patreon or Ko-fi!
			</CardFooter>
		</Card>
	);
}
