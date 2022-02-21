import { EventEmitter } from "../event";
import { RetryAttempt, WebSocketRetry } from "./websocket-retry";
import LRUCache from 'lru-cache';

export enum WebSocketStatus {
  Connecting,
  Connected,
  Disconnected,
  Error,
}

/**
 * Core Events that this provider supports.
 */
export interface WebSocketEventMap {
  "status": WebSocketStatus
  "retryMaxAttemptsReached": number
  "retryStarting": void
  "retryAttempt": RetryAttempt
  "retrySuccess": RetryAttempt
}

type WebSocketMessageFormatter = ((result: unknown) => unknown) | undefined

interface WebSocketSubscriptionMap<EventMap extends WebSocketEventMap> {
  event: keyof EventMap | keyof WebSocketEventMap
  formatter?: WebSocketMessageFormatter
}

interface WebSocketSubscribedEvent {
  name: keyof WebSocketEventMap
  formatter: WebSocketMessageFormatter
}

/**
 * Defines a go-ethereum async message type.
 */
interface AsyncMessage<T> {
  jsonrpc: "2.0"
  id?: number
  method?: string
  params?: {
    result: T,
    subscription: string
  }
  result?: string
}

// TODO: This is for the V7 upgrade, wait till we have a new version of @types/lru-cache
// then this extra override can be removed.
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/58707
declare module "lru-cache" {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface Options<K, V> { // 
    ttl: number;
  }
}

export class WebSocketProvider<EventMap extends WebSocketEventMap> extends WebSocketRetry {
  private eventEmitter = EventEmitter<keyof EventMap>()
  private connection: WebSocket;
  private asyncId: number = 0
  private promiseMap: { [key: number]: [(value: any | PromiseLike<any>) => void, (e: unknown) => void] } = {}
  private cache = new LRUCache({
    max: 10000,
    ttl: 1000 * 60 * 60  // 1 hour
  });
  private _status: WebSocketStatus = WebSocketStatus.Connecting
  private ethSubcribeMap: { [key: string]: WebSocketSubscribedEvent } = {}

  constructor(private url: string, maxRetry: number, private channelsToSubscribe: WebSocketSubscriptionMap<EventMap>[]) {
    super(maxRetry);
    this.connection = new WebSocket(this.url);
  }

  public get ready(): Promise<void> {
    return this.connect()
  }

  public get status() {
    return this._status;
  }

  private set status(status: WebSocketStatus) {
    this._status = status;
  }

  protected onRetry(): Promise<void> {
    this.connection = new WebSocket(this.url);
    return this.connect()
  }

  protected onRetryMaxAttemptsReached(attempts: number) {
    this.eventEmitter.emit('retryMaxAttemptsReached', attempts);
  }

  protected onRetryStarting() {
    this.eventEmitter.emit('retryStarting', null);
  }

  protected onRetryAttempt(elapsed: number, attempt: number) {
    this.eventEmitter.emit('retryAttempt', { elapsed, attempt })
  }

  protected onRetrySuccess(elapsed: number, attempt: number) {
    this.eventEmitter.emit('retrySuccess', { elapsed, attempt })
  }

  /**
   * Connects to the websocket, and promises a return. This is must be private
   * since the caller should use `ready` to wait for the connection.
   */
  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.addEventListener("close", () => {
        this.status = WebSocketStatus.Disconnected;
        this.eventEmitter.emit('status', this.status);
        this.attemptReconnect();
      });

      this.connection.addEventListener("message", this.onMessage.bind(this));

      this.connection.addEventListener("open", () => {
        this.recordSuccessfulConnection();
        this.status = WebSocketStatus.Connected;
        this.eventEmitter.emit('status', this.status);
        resolve();
      });

      this.connection.addEventListener("error", (e) => {
        this.status = WebSocketStatus.Error;
        this.eventEmitter.emit('status', this.status);
        reject(e)
      });
    })
  }

  public subscribeToChannels() {
    return new Promise<void>((resolve, reject) => {
      // Make sure we get a registration callback from websocket so that can be guaranteed
      // to be connected to these channels.
      const ensureChannelsSubscribed = this.channelsToSubscribe.map(sub => (
        new Promise<[keyof WebSocketEventMap, string, WebSocketMessageFormatter]>((resolve, reject) => {
          this.send("eth_subscribe", [sub.event]).then((data) => {
            resolve([sub.event as keyof WebSocketEventMap, data as string, sub.formatter])
          }).catch(e => reject(e))
        })
      ))

      Promise.all(ensureChannelsSubscribed).then((results) => {
        results.forEach(([name, id, formatter]) => {
          this.ethSubcribeMap[id] = { name, formatter }
        })
        resolve()
      }).catch(e => reject(e))
    })
  }

  protected async send<T extends {}>(method: string, params: any[]): Promise<T> {
    const id = this.getNextAsyncId();
    return new Promise((resolve, reject) => {
      this.promiseMap[id] = [resolve, reject]
      this.connection.send(JSON.stringify({
        id,
        jsonrpc: "2.0",
        method,
        params
      }))
    })
  }

  protected async cachedExecutor<T>(key: string, callback: () => Promise<T>, maxAge?: number): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T
    }
    const result = await callback()
    this.cache.set(key, result, maxAge)
    return result
  }

  private getNextAsyncId(): number {
    return ++this.asyncId;
  }

  public disconnect(): void {
    this.eventEmitter.clear();
    this.connection.close();
  }

  public on<K extends keyof EventMap>(type: K, listener: (ev: EventMap[K]) => void) {
    this.eventEmitter.on(type, listener);
  }

  public off<K extends keyof EventMap>(type: K, listener: (ev: EventMap[K]) => void) {
    this.eventEmitter.off(type, listener);
  }

  public onMessage(evt: MessageEvent) {
    // Sometimes messages come in multiple pairs to detect it.
    if (evt.data.indexOf('\n') !== -1) {
      const numberOfMessages = evt.data.split('\n')
      numberOfMessages.forEach((message: string) => this.processMessage(message))
    } else {
      this.processMessage(evt.data as string);
    }
  }

  private processMessage(message: string): void {
    let eventData: AsyncMessage<{}>
    try {
      eventData = JSON.parse(message) as AsyncMessage<{}>
    }
    catch (e) {
      console.error(`Please report to developer: "${message}"`)
      return
    }

    if (eventData.id) {
      const [resolve,] = this.promiseMap[eventData.id]
      resolve(eventData.result !== undefined ? eventData.result : eventData.params?.result)
      delete this.promiseMap[eventData.id]
    } else if (eventData.method === 'eth_subscription') {
      if (!eventData.params) {
        console.error('Something went wrong with receiving the message from server');
        return;
      }
      const subscribedEvent = this.ethSubcribeMap[eventData.params.subscription];
      if (subscribedEvent) {
        this.eventEmitter.emit(subscribedEvent.name, subscribedEvent.formatter ? subscribedEvent.formatter(eventData.params.result) : eventData.params.result)
      }
      else {
        console.error('unknown event', eventData.params)
      }
    }
  }
}
