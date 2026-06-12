import { ServiceToken, type IOptions } from '../di/ServiceCollection';
import type { BackendOptions, StorageOptions, DomOptions } from '../../config/AppConfig';
import type { EventBus, AppEvents } from '../services/EventBus';
import type { Logger } from '../logging/Logger';
import type { AppElements } from './AppHost';

// Configuration sections, resolved as IOptions<T>.
export const BackendOptionsToken = new ServiceToken<IOptions<BackendOptions>>('BackendOptions');
export const StorageOptionsToken = new ServiceToken<IOptions<StorageOptions>>('StorageOptions');
export const DomOptionsToken = new ServiceToken<IOptions<DomOptions>>('DomOptions');

// Ambient/host services keyed by token (no class to use as identity).
export const AppElementsToken = new ServiceToken<AppElements>('AppElements');
export const EventBusToken = new ServiceToken<EventBus<AppEvents>>('EventBus');
export const LoggerToken = new ServiceToken<Logger>('Logger');
