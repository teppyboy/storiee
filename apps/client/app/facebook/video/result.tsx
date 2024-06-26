"use client";
import { VideoResult } from "@/components/storiee/video-result";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useSWR from "swr";

// biome-ignore lint/suspicious/noExplicitAny: it's just a fetch so any is fine
const fetcher = (...args: any[]) => fetch(...args).then((res) => res.json());

export default function VideoDownloadResult({
	videoUrl,
	method,
	removeResult,
}) {
	// Smartest way to handle the download :nerd:
	console.log("Downloading video", videoUrl, method);
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
					<CardContent>Failed to download video information.</CardContent>
				</Card>
			</div>
		);
	}
	if (isLoading) {
		return (
			<div>
				<Card className="w mt-4">
					<CardHeader>
						<CardTitle>Downloading...</CardTitle>
					</CardHeader>
					<CardContent className="text-opacity-80">
						The process will take a few seconds, please wait.
						<br />
						If you are using "Intercept" method then it'll take a bit longer.
					</CardContent>
				</Card>
			</div>
		);
	}
	return (<VideoResult
		data={data}
		removeResultButton={removeResultButton}
		videoUrl={videoUrl}
	/>);
}
