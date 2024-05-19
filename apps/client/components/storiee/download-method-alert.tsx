import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "../ui/button";

function DownloadMethodAlert() {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button className="m-0 p-0 pl-1 opacity-75" variant="link">
					(Which one should I use?)
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogDescription>
						By default HTML is the recommended method, but if you are having
						problems with it, you can try the Intercept method.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogAction>OK</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export { DownloadMethodAlert };
