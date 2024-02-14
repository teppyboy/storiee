class RemoteVideo {
	url: string;
	width: number;
	height: number;
	bandwidth: number;
	audio: boolean;
	constructor(
		url: string,
		width: number,
		height: number,
		bandwidth: number,
		audio: boolean,
	) {
		this.url = url;
		this.width = width;
		this.height = height;
		this.bandwidth = bandwidth;
		this.audio = audio;
	}
}

export { RemoteVideo };
