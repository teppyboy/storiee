import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

type StoryResultProps = {
	// biome-ignore lint/suspicious/noExplicitAny: data here is data from the API
	data: any;
	// biome-ignore lint/suspicious/noExplicitAny: removeResultButton is a function
	removeResultButton: any;
	storyUrl: string | undefined;
};

function StoryResult({ data, removeResultButton, storyUrl }: StoryResultProps) {
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
	if (storyData.stories.length === 0) {
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
						Successfully fetch story information, but there isn't any video
						stories in the URL you provided.
					</CardContent>
				</Card>
			</div>
		);
	}
	const tabsTriggers = [];
	const tabsContents = [];
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
		for (const video of story.muted) {
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
		if (videoButtons.length > 0 || audios.length > 0) {
			vidWithoutAudios.push(
				<div>
					<h4 className="mb-2">Videos WITHOUT audio</h4>
					{videoButtons}
					{audios}
				</div>,
			);
		}
		if (storyData.stories.length <= 5) {
			tabsTriggers.push(
				<TabsTrigger value={i.toString()}>Story {i + 1}</TabsTrigger>,
			);
		} else {
			tabsTriggers.push(
				<TabsTrigger value={i.toString()}>{i + 1}</TabsTrigger>,
			);
		}
		if (story.muted.length === 0 && !story.unified.browser_native_hd_url) {
			tabsContents.push(
				<TabsContent value={i.toString()}>
					<div>The story is probably not a video story.</div>
				</TabsContent>,
			);
		} else {
			const vidWithAudios = [];
			if (story.unified.browser_native_sd_url) {
				vidWithAudios.push(
					<div className="my-2">
						<h4 className="mb-2">Videos with audio</h4>
						<Button
							className="mr-2"
							onClick={() =>
								window.open(story.unified.browser_native_sd_url, "_blank")
							}
						>
							SD
						</Button>
						<Button
							onClick={() =>
								window.open(story.unified.browser_native_hd_url, "_blank")
							}
						>
							HD
						</Button>
					</div>,
				);
			}
			tabsContents.push(
				<TabsContent value={i.toString()}>
					{vidWithAudios}
					{vidWithoutAudios}
				</TabsContent>,
			);
		}
	}
	const viewStoryButton =
		storyData.stories.length > 0 ? (
			<div className="text-balance">
				<a href={storyUrl} target="_blank" rel="noreferrer">
					Click here to open the story in Facebook.
				</a>
			</div>
		) : (
			<div />
		);
	// Render story information
	return (
		<Card className="w mt-4">
			<CardHeader>
				<div className="flex flex-row">
					<CardTitle>Result</CardTitle>
					{removeResultButton}
				</div>
				<CardDescription className="text-wrap">
					Successfully fetch story information, click the story you want to
					download.
					{viewStoryButton}
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

export { StoryResult };
