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
import React, { type ChangeEvent, FormEvent, useState } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { CardDownloadForm } from "@/components/storiee/card-download-form";

export default function StoryDownloadForm({ onDownloadClicked }) {
	const [acceptToS, setAcceptToS] = useState(false);
	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const storyUrl = formData.get("story-html") as string;
		onDownloadClicked(storyUrl, acceptToS);
	}
	function handleAcceptToSChange(checked: CheckedState) {
		console.log(checked.valueOf() as boolean);
		setAcceptToS(checked.valueOf() as boolean);
	}
	const content = (
		<div className="grid w-full items-center gap-4">
			<div className="flex flex-col space-y-1.5">
				<Label htmlFor="url">HTML</Label>
				<Textarea
					className="h-0.5"
					name="story-html"
					placeholder="Paste the content of the HTML page, you can access that page by pressing Ctrl + U on PC or appending 'view-source:' before the URL on mobile"
				/>
			</div>
			<div>
				<div className="grid gap-1.5 leading-none">
					<div className="flex items-center space-x-2">
						<Checkbox onCheckedChange={handleAcceptToSChange} id="terms" />
						<Label className="peer-disabled:cursor-not-allowed" htmlFor="terms">
							Accept terms and conditions
						</Label>
					</div>
					<p className="text-sm text-muted-foreground">
						You agree to our Terms of Service and Privacy Policy.
					</p>
				</div>
			</div>
		</div>
	);
	return (
		<CardDownloadForm
			title="Private Story Downloader"
			description="Easily download any private Facebook stories."
			content={content}
			onSubmit={onSubmit}
		/>
	);
}
