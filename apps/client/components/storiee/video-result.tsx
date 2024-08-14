import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../ui/card";

type VideoResultProps = {
	// biome-ignore lint/suspicious/noExplicitAny: data here is data from the API
	data: any;
	// biome-ignore lint/suspicious/noExplicitAny: removeResultButton is a function
	removeResultButton: any;
	videoUrl: string | undefined;
};

function VideoResult({ data, removeResultButton, videoUrl }: VideoResultProps) {
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
						An error occurred while downloading the video information:
						<br />
						<pre>
							<code>{data.message}</code>
						</pre>
						<br />
						Error code: <code>{data.error}</code>
					</CardContent>
				</Card>
			</div>
		);
	}
	const videoData = data.data;
	if (videoData.video.length === 0) {
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
						Successfully fetch video information, but there isn't any video in
						the URL you provided.
					</CardContent>
				</Card>
			</div>
		);
	}
	const content = [];
	const videoButtons = [];
	for (const video of videoData.video.muted) {
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
		videoData.video.muted.length === 0 &&
		!videoData.video.unified.browser_native_hd_url
	) {
		content.push(<div>The video url is probably not a video.</div>);
	} else {
		const vidWithAudios = [];
		if (videoData.video.unified.browser_native_sd_url) {
			vidWithAudios.push(
				<div className="my-2">
					<h4 className="mb-2">Videos with audio</h4>
					<Button
						className="mr-2"
						onClick={() =>
							window.open(
								videoData.video.unified.browser_native_sd_url,
								"_blank",
							)
						}
					>
						SD
					</Button>
					<Button
						onClick={() =>
							window.open(
								videoData.video.unified.browser_native_hd_url,
								"_blank",
							)
						}
					>
						HD
					</Button>
				</div>,
			);
		}
		content.push(
			<div>
				{vidWithAudios}
				{vidWithoutAudios}
			</div>,
		);
	}
	// Render video information
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
			<CardContent>{content}</CardContent>
			<CardFooter>
				Like this project? Consider supporting me on Patreon or Ko-fi!
			</CardFooter>
		</Card>
	);
}

export { VideoResult };
