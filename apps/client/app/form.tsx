'use client';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from 'react';

export default function StoryDownloadForm() {
	const [storyUrl, setStoryUrl] = useState('');
	const handleStoryUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
        // this.props.storyUrl = e.target.value;   
        const router = useRouter();
        router.push(`URL?query=${e.target.value}`);
		setStoryUrl(e.target.value);
	}
	function handleDownload() {
		console.log('Downloading story from', storyUrl);
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
				<form onSubmit={e => { e.preventDefault(); }}>
					<div className="grid w-full items-center gap-4">
						<div className="flex flex-col space-y-1.5">
							<Label htmlFor="url">Story URL</Label>
							<Input
								id="story-url"
								placeholder="URL of the story you want to download"
								onChange={(e) => handleStoryUrlChange(e)}
							/>
						</div>
						<div className="flex flex-col space-y-1.5">
							<Label htmlFor="method">Method</Label>
							<Select>
								<SelectTrigger id="method">
									<SelectValue defaultValue="html" placeholder="Select" />
								</SelectTrigger>
								<SelectContent position="popper">
									<SelectItem value="html">HTML</SelectItem>
									<SelectItem value="intercept">Intercept</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="link">Which one should I use?</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogDescription>
											By default HTML is the recommended method, but if you
											are having problems with it, you can try the Intercept
											method.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogAction>OK</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox id="terms" />
							<Label htmlFor="terms">Accept terms and conditions</Label>
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