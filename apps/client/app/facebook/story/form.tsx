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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import React, { FormEvent, useState } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { DownloadMethodAlert } from "@/components/storiee/download-method-alert";
import Link from "next/link";
import { CardDownloadForm } from "@/components/storiee/card-download-form";

export default function StoryDownloadForm({ onDownloadClicked }) {
	const [downloadMethod, setDownloadMethod] = useState("html");
	const [acceptToS, setAcceptToS] = useState(false);
	function handleDownloadMethodChange(option: string) {
		console.log(option);
		setDownloadMethod(option);
	}
	function handleAcceptToSChange(checked: CheckedState) {
		console.log(checked.valueOf() as boolean);
		setAcceptToS(checked.valueOf() as boolean);
	}
	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const storyUrl = formData.get("url") as string;
		onDownloadClicked(storyUrl, downloadMethod, acceptToS);
	}
	const content = (
		<>
			<div className="text-sm text-muted-foreground my-2">
				<Link href="/facebook/story/private">
					<u>Interested in downloading private stories? Click here :)</u>
				</Link>
			</div>
			<div className="grid w-full items-center gap-4">
				<div className="flex flex-col space-y-1.5">
					<Label htmlFor="url">Story URL</Label>
					<Input
						type="url"
						name="url"
						placeholder="URL of the story you want to download"
					/>
				</div>
				<div className="flex flex-col space-y-1.5">
					<div>
						<Label htmlFor="method">Method</Label>
						<DownloadMethodAlert />
					</div>
					<Select onValueChange={handleDownloadMethodChange}>
						<SelectTrigger id="method">
							<SelectValue defaultValue="html" placeholder="HTML" />
						</SelectTrigger>
						<SelectContent position="popper">
							<SelectItem value="html">HTML</SelectItem>
							<SelectItem value="intercept">Intercept</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div>
					<div className="grid gap-1.5 leading-none">
						<div className="flex items-center space-x-2">
							<Checkbox onCheckedChange={handleAcceptToSChange} id="terms" />
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
		</>
	);
	return (
		<CardDownloadForm
			title="Story Downloader"
			description="Easily download any public Facebook stories."
			content={content}
			onSubmit={onSubmit}
		/>
	);
}
