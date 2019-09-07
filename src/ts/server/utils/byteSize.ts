const MB = 1024 * 1024;

export class ByteSize {
	constructor(public bytes = 0, public mbytes = 0) {
		this.reduce();
	}
	add({ bytes, mbytes }: ByteSize) {
		this.addBytes(bytes, mbytes);
	}
	addBytes(bytes: number, mbytes = 0) {
		this.mbytes += mbytes;
		this.bytes += bytes;
		this.reduce();
		return this;
	}
	toString() {
		return this.mbytes ? `${this.mbytes.toString()}${this.bytes.toString().padStart(6, '0')}` : this.bytes.toString();
	}
	toSortableString() {
		return `${this.mbytes.toString().padStart(9, '0')}-${this.bytes.toString().padStart(6, '0')}`;
	}
	toHumanReadable() {
		return this.mbytes >= 1 ?
			`${this.mbytes} mb` :
			(this.bytes >= 2048 ? `${Math.floor(this.bytes / 1024)} kb` : `${this.bytes} b`);
	}
	private reduce() {
		this.mbytes += Math.floor(this.bytes / MB);
		this.bytes = this.bytes % MB;
	}
}
