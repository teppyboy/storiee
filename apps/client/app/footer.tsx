"use client";
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

export default function Footer() {
	return (
		<footer className="w-full bottom-full mx-auto flex flex-row bg-slate-50 content-center p-4 justify-center">
			<Button
				onClick={() =>
					window.open("https://github.com/teppyboy/storiee", "_blank")
				}
				variant="link"
			>
				GitHub
			</Button>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button variant="link">Support me ♡</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogDescription>
							You can support me by joining{" "}
							<Button
								onClick={() =>
									window.open("https://patreon.com/tretrauit", "_blank")
								}
								className="m-0 p-0 pr-1"
								variant="link"
							>
								my Patreon
							</Button>
							or{" "}
							<Button
								className="m-0 p-0 pr-1"
								onClick={() =>
									window.open("https://ko-fi.com/tretrauit", "_blank")
								}
								variant="link"
							>
								my Ko-fi
							</Button>
							<br></br>
							Your support is greatly appreciated, as it helps me to continue
							creating better free and open-source software.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction>Thank you!</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</footer>
	);
}
