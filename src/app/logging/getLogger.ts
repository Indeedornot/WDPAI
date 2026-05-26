import { Logger } from './Logger';

export function getLogger(name: string): Logger
{
  return Logger.named(name);
}

