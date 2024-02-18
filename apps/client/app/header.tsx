import { Button } from "@/components/ui/button";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 p-4 flex flex-row bg-slate-100">
			<a
				href="/"
				className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-4xl mr-4"
			>
				Storiee
			</a>
			<div className="w-full flex justify-end">
				<a href="/" className="p-2 font-normal text-1.5xl">
					Reels
				</a>
				<a href="/facebook/video" className="p-2 font-normal text-1.5xl">
					Video
				</a>
				<a href="/" className="p-2 font-normal text-1.5xl">
					Story
				</a>
			</div>
		</header>
	);
}
