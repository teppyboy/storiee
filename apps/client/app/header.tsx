import Link from "next/link";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 p-4 flex flex-row bg-slate-100">
			<div className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-4xl mr-4">
				Storiee
			</div>
			<div className="w-full flex justify-end">
				<Link href="/facebook/video" className="p-2 font-normal text-1.5xl">
					Videos/Reels
				</Link>
				<Link href="/" className="p-2 font-normal text-1.5xl">
					Story
				</Link>
			</div>
		</header>
	);
}
