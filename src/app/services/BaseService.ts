import { HttpClient } from '../http/HttpClient';
import { Logger } from '../logging/Logger';

export interface ServiceOptions
{
  credentials?: RequestCredentials;
  headersProvider?: () => Record<string, string>;
}

export class BaseService
{
  protected http: HttpClient;
  protected logger: Logger;

  constructor(baseUrl: string, className: string, options: ServiceOptions = {})
  {
    this.http = new HttpClient(baseUrl, {
      credentials: options.credentials ?? 'include',
      headersProvider: options.headersProvider,
    });
    this.logger = Logger.named(className);
  }
}
