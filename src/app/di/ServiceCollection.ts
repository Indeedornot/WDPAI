/**
 * A small, C#-flavoured dependency-injection container.
 *
 * Usage:
 *   const services = new ServiceCollection();
 *   services.addSingleton(AuthClient, (sp) => new AuthClient(sp.getRequiredService(BackendOptions).value.baseUrl));
 *   const sp = services.build();
 *   const auth = sp.getRequiredService(AuthClient);
 *
 * Services are registered against a key (a class constructor, or a typed
 * ServiceToken for interfaces/values/options) with a factory lambda that
 * receives the provider so it can resolve its own dependencies. All services
 * are singletons: a factory runs at most once and its result is cached.
 */

/** A typed key for services that have no class to use as their identity. */
export class ServiceToken<T>
{
  readonly description: string;

  constructor(description: string)
  {
    this.description = description;
  }

  /** Narrows an unknown value to T at a resolution boundary (identity at runtime). */
  cast(value: unknown): T
  {
    return value as T;
  }

  toString(): string
  {
    return `ServiceToken(${this.description})`;
  }
}

/** Any class constructor producing a T (used as its own service key). */
export type Constructor<T> = abstract new (...args: never[]) => T;

/** A service is keyed either by its class or by an explicit token. */
export type ServiceKey<T> = ServiceToken<T> | Constructor<T>;

/** Resolves registered services. */
export interface IServiceProvider
{
  getRequiredService<T>(key: ServiceKey<T>): T;
  getService<T>(key: ServiceKey<T>): T | undefined;
}

/** Factory lambda; receives the provider to resolve dependencies. */
export type ServiceFactory<T> = (provider: IServiceProvider) => T;

/** Wrapper for a configuration object, mirroring C#'s IOptions<T>. */
export interface IOptions<T>
{
  readonly value: T;
}

function describeKey(key: ServiceKey<unknown>): string
{
  return key instanceof ServiceToken ? key.toString() : (key as { name?: string }).name ?? 'Anonymous';
}

/** Registers service factories, then produces a provider via build(). */
export class ServiceCollection
{
  private readonly _factories = new Map<ServiceKey<unknown>, ServiceFactory<unknown>>();

  /** Registers a service built lazily by a factory (cached after first use). */
  addSingleton<T>(key: ServiceKey<T>, factory: ServiceFactory<T>): this
  {
    this._factories.set(key as ServiceKey<unknown>, factory as ServiceFactory<unknown>);
    return this;
  }

  /** Registers an already-constructed value (constant) as a service. */
  addValue<T>(key: ServiceKey<T>, value: T): this
  {
    return this.addSingleton(key, () => value);
  }

  /** Registers an options object as IOptions<T>, mirroring services.Configure. */
  configure<T>(token: ServiceKey<IOptions<T>>, value: T): this
  {
    return this.addValue(token, { value });
  }

  build(): IServiceProvider
  {
    return new ServiceProvider(this._factories);
  }
}

class ServiceProvider implements IServiceProvider
{
  private readonly _factories: Map<ServiceKey<unknown>, ServiceFactory<unknown>>;
  private readonly _singletons = new Map<ServiceKey<unknown>, unknown>();
  private readonly _resolving = new Set<ServiceKey<unknown>>();

  constructor(factories: Map<ServiceKey<unknown>, ServiceFactory<unknown>>)
  {
    this._factories = factories;
  }

  getService<T>(key: ServiceKey<T>): T | undefined
  {
    const k = key as ServiceKey<unknown>;
    if (this._singletons.has(k))
    {
      return this._singletons.get(k) as T;
    }

    const factory = this._factories.get(k);
    if (!factory)
    {
      return undefined;
    }

    if (this._resolving.has(k))
    {
      throw new Error(`Circular service dependency while resolving ${describeKey(k)}`);
    }

    this._resolving.add(k);
    try
    {
      const instance = factory(this);
      this._singletons.set(k, instance);
      return instance as T;
    }
    finally
    {
      this._resolving.delete(k);
    }
  }

  getRequiredService<T>(key: ServiceKey<T>): T
  {
    const service = this.getService(key);
    if (service === undefined)
    {
      throw new Error(`No service registered for ${describeKey(key as ServiceKey<unknown>)}`);
    }
    return service;
  }
}
