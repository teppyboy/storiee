import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FormEvent } from "react";
import { Button } from "../ui/button";

type CardDownloadFormProps = {
	title: string;
	description: string;
	content: React.ReactNode;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function CardDownloadForm({
	title,
	description,
	content,
	onSubmit,
}: CardDownloadFormProps) {
	return (
		<Card className="w">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<form onSubmit={onSubmit}>
				<CardContent>{content}</CardContent>
				<CardFooter className="flex justify-right">
					<Button type="submit">Download</Button>
				</CardFooter>
			</form>
		</Card>
	);
}

export { CardDownloadForm };
