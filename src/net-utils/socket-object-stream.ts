import { Socket } from "net";
import { Subject, Observable } from "rxjs";

export class SocketObjectStream {
	
	private prevSurplus: Buffer;
	private messagesSubject: Subject<any> = new Subject();
	
	constructor(
		private socket: Socket
	) {
		this.socket.on('data', this.onData.bind(this));
		this.socket.on('error', this.onError.bind(this));
		this.socket.on('close', this.onClose.bind(this));
	}

	private onClose(): void {
		this.messagesSubject.complete();
	}

	private onError(error: any): void {
		this.messagesSubject.error(error);
	}

	private onData(data: Buffer): void {
		
		let finished = false;
		let pos = 0;

		while (!finished) {
			const separatorPosition = data.indexOf(0, pos);

			if (separatorPosition !== -1) {
				if (this.prevSurplus) {
					const message = Buffer.concat([this.prevSurplus, data.slice(pos, separatorPosition)]).toString();
					this.onMessage(JSON.parse(message.toString()));
					this.prevSurplus = null;
				} else {
					const message = data.slice(pos, separatorPosition).toString();
					this.onMessage(JSON.parse(message.toString()));
				}
				
				pos = separatorPosition + 1;
			}
			
			finished = separatorPosition === -1;
		}

		if (pos < data.length) {
			this.prevSurplus = data.slice(pos);
		}
	}

	private onMessage(message: any): void {
		this.messagesSubject.next(message);
	}

	public getReceivedMessages(): Observable<any> {
		return this.messagesSubject.asObservable();
	}

	public sendMessage(message: any): void {
		this.socket.write(JSON.stringify(message));
        this.socket.write(new Uint8Array([0]));
	}
}