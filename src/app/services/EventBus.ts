export type AppEvents = {
  'auth:changed': void;
};

type EventHandler<T> = T extends void ? () => void : (data: T) => void;

export class EventBus<TEvents extends Record<string, unknown> = Record<string, unknown>>
{
  private handlers = new Map<keyof TEvents, Array<EventHandler<unknown>>>();

  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void
  {
    let list = this.handlers.get(event);
    if (!list)
    {
      list = [];
      this.handlers.set(event, list);
    }
    list.push(handler);
  }

  off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void
  {
    const list = this.handlers.get(event);
    if (!list) 
    {
      return;
    }
    const idx = list.indexOf(handler);
    if (idx >= 0) 
    {
      list.splice(idx, 1);
    }
  }

  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K] extends void ? [] : [TEvents[K]]): void
  {
    const list = this.handlers.get(event);
    if (!list) 
    {
      return;
    }
    for (const handler of list)
    {
      (handler as (...a: unknown[]) => void)(...args);
    }
  }

  clear(): void
  {
    this.handlers.clear();
  }
}
