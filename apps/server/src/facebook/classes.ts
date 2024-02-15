class RemoteVideo {
	url: string;
	width: number;
	height: number;
	bandwidth: number;
	audio: boolean;
	thumbnail: string | null;
	constructor(
		url: string,
		width: number,
		height: number,
		bandwidth: number,
		audio: boolean,
		thumbnail: string | null,
	) {
		this.url = url;
		this.width = width;
		this.height = height;
		this.bandwidth = bandwidth;
		this.audio = audio;
		this.thumbnail = thumbnail;
	}
}

export { RemoteVideo };
