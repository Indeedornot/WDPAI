/* eslint-disable @typescript-eslint/no-explicit-any */
// Resolves the full DI graph under a fake DOM to prove the composition root has
// no missing registrations, circular dependencies, or constructor throws.
import { installFakeDom } from './fakeDom';

installFakeDom();

async function main(): Promise<void>
{
  const { ConfigurationLoader } = await import('../config/ConfigurationLoader');
  const { AppHost } = await import('../app/bootstrap/AppHost');
  const { Startup } = await import('../app/bootstrap/Startup');

  const config = ConfigurationLoader.load({ VITE_BACKEND_URL: 'http://localhost:8081' });
  const elements = AppHost.mount(config.dom);
  const sp = Startup.configureServices(config, elements);

  // Resolving the top-level views forces the entire graph to be constructed.
  const { PauseMenu } = await import('../app/ui/PauseMenu');
  const { WelcomeScreen } = await import('../app/ui/WelcomeScreen');
  const { RegisterGate } = await import('../app/ui/RegisterGate');
  const { SettingsPanel } = await import('../app/ui/SettingsPanel');
  const { Tutorial } = await import('../app/ui/Tutorial');
  const { DeathFlowController } = await import('../app/game/DeathFlowController');
  const { GameController } = await import('../app/game/GameController');

  for (const key of [PauseMenu, WelcomeScreen, RegisterGate, SettingsPanel, Tutorial, DeathFlowController, GameController])
  {
    sp.getRequiredService(key as any);
  }

  console.log('[smoke] DI graph resolved: backend =', config.backend.baseUrl);
  console.log('[smoke] OK');
}

main().catch((e: unknown) =>
{
  console.error('[smoke] FAILED');
  console.error(e);
  (globalThis as any).process?.exit?.(1);
});
