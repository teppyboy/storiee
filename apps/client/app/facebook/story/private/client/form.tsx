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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import React, { ChangeEvent, useState } from "react";
import { CheckedState } from "@radix-ui/react-checkbox";

export default function StoryDownloadForm({ onDownloadClicked }) {
	const [storyUrl, setStoryUrl] = useState("");
	const [acceptToS, setAcceptToS] = useState(false);
	function handleDownload() {
		console.log("Download button clicked");
		onDownloadClicked(storyUrl, acceptToS);
	}
	function handleStoryUrlChange(e: ChangeEvent<HTMLTextAreaElement>) {
		setStoryUrl(e.target.value);
		console.log(e.target.value);
	}
	function handleAcceptToSChange(checked: CheckedState) {
		console.log(checked.valueOf() as boolean);
		setAcceptToS(checked.valueOf() as boolean);
	}
	return (
		<Card className="w">
			<CardHeader>
				<CardTitle>Story Downloader</CardTitle>
				<CardDescription>
					Easily download any public Facebook stories.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
					}}
				>
					<div className="grid w-full items-center gap-4">
						<div className="flex flex-col space-y-1.5">
							<Label htmlFor="url">HTML</Label>
							<Textarea
								onChange={(e) => handleStoryUrlChange(e)}
								className="h-0.5"
								placeholder="Paste the content of the HTML page, you can access that page by pressing Ctrl + U on PC"
							/>
						</div>
						<div>
							<div className="grid gap-1.5 leading-none">
								<div className="flex items-center space-x-2">
									<Checkbox
										onCheckedChange={handleAcceptToSChange}
										id="terms"
									/>
									<Label
										className="peer-disabled:cursor-not-allowed"
										htmlFor="terms"
									>
										Accept terms and conditions
									</Label>
								</div>
								<p className="text-sm text-muted-foreground">
									You agree to our Terms of Service and Privacy Policy.
								</p>
							</div>
						</div>
					</div>
				</form>
			</CardContent>
			<CardFooter className="flex justify-right">
				<Button onClick={handleDownload}>Download</Button>
			</CardFooter>
		</Card>
	);
}
