/**
 * Adds a dynamnic retry mechanism to the WebSocket class.
 */
export abstract class WebSocketRetry {
  private retry = 0;
  private startReconnectingTime = 0;

  constructor(private maxRetry: number, private maxDelayInSeconds = 90) { }

  public attemptReconnect() {
    if (this.maxRetry <= this.retry) {
      console.info('[retry]', `Reached maximium retry attempts of ${this.maxRetry}, will not reconnect`);
      this.onRetryMaxAttemptsReached(this.maxRetry);
      return;
    }

    if (this.retry === 0) {
      console.info('[retry]', `Starting reconnection attempts`);
      this.onRetryStarting();
      this.startReconnectingTime = Date.now();
    }

    this.retry = this.retry + 1;
    const delayInSeconds = Math.min(
      this.maxDelayInSeconds, 
      Math.max(Math.min(Math.pow(2, this.retry) + this.randInt(-this.retry, this.retry), 600), 1) + 3
    );

    console.info('[retry]', `Attempting to reconnect in ${delayInSeconds}s`);
    this.onRetryAttempt(delayInSeconds, this.retry);

    setTimeout(async () => await this.onRetry(), delayInSeconds * 1000);
  }

  public recordSuccessfulConnection() {
    if (this.retry === 0)
      return;

    const ellapsedTimeInSeconds = (Date.now() - this.startReconnectingTime) / 1000;
    console.info('[retry]', `Successfully reconnected in ${Math.floor(ellapsedTimeInSeconds)}s with ${this.retry === 1 ? 'a single attempt' : `${this.retry} attempts`}`);
    this.onRetrySuccess(ellapsedTimeInSeconds, this.retry);

    this.retry = 0;
    this.startReconnectingTime = 0;
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  protected abstract onRetry(): Promise<void>;
  protected abstract onRetryMaxAttemptsReached(attempts: number): void;
  protected abstract onRetryStarting(): void;
  protected abstract onRetryAttempt(whenInSeconds: number, attempt: number): void;
  protected abstract onRetrySuccess(ellapsed: number, attempts: number): void;
}



export interface RetryAttempt {
  elapsed: number
  attempt: number
}
