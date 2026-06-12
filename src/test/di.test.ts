import { TestRunner } from './TestRunner';
import { Assert } from './Assert';
import { ServiceCollection, ServiceToken, type IOptions } from '../app/di/ServiceCollection';

class Engine
{
  started = false;
  start(): void 
  {
    this.started = true; 
  }
}

class Car
{
  readonly engine: Engine;
  constructor(engine: Engine) 
  {
    this.engine = engine; 
  }
}

const NameToken = new ServiceToken<string>('name');
const ConfigToken = new ServiceToken<IOptions<{ url: string }>>('config');

TestRunner.describe('ServiceCollection', () =>
{
  TestRunner.it('resolves a class service via factory', () =>
  {
    const sp = new ServiceCollection()
      .addSingleton(Engine, () => new Engine())
      .build();

    const engine = sp.getRequiredService(Engine);
    Assert.assertTrue(engine instanceof Engine, 'should build an Engine');
  });

  TestRunner.it('injects dependencies through the provider', () =>
  {
    const sp = new ServiceCollection()
      .addSingleton(Engine, () => new Engine())
      .addSingleton(Car, (p) => new Car(p.getRequiredService(Engine)))
      .build();

    const car = sp.getRequiredService(Car);
    Assert.assertTrue(car.engine instanceof Engine, 'car should receive the engine');
  });

  TestRunner.it('returns the same singleton instance', () =>
  {
    const sp = new ServiceCollection().addSingleton(Engine, () => new Engine()).build();
    Assert.assertStrictEquals(sp.getRequiredService(Engine), sp.getRequiredService(Engine), 'singleton');
  });

  TestRunner.it('runs each factory at most once', () =>
  {
    let built = 0;
    const sp = new ServiceCollection()
      .addSingleton(Engine, () => 
      {
        built++; return new Engine(); 
      })
      .build();
    sp.getRequiredService(Engine);
    sp.getRequiredService(Engine);
    Assert.assertEquals(built, 1, 'factory should run once');
  });

  TestRunner.it('resolves token-keyed values and options', () =>
  {
    const sp = new ServiceCollection()
      .addValue(NameToken, 'Ada')
      .configure(ConfigToken, { url: 'http://x' })
      .build();
    Assert.assertEquals(sp.getRequiredService(NameToken), 'Ada', 'value');
    Assert.assertEquals(sp.getRequiredService(ConfigToken).value.url, 'http://x', 'options');
  });

  TestRunner.it('getService returns undefined for unknown keys', () =>
  {
    const sp = new ServiceCollection().build();
    Assert.assertTrue(sp.getService(Engine) === undefined, 'unknown service is undefined');
  });

  TestRunner.it('getRequiredService throws for unknown keys', () =>
  {
    const sp = new ServiceCollection().build();
    let threw = false;
    try 
    {
      sp.getRequiredService(Engine); 
    }
    catch 
    {
      threw = true; 
    }
    Assert.assertTrue(threw, 'should throw for missing required service');
  });
});
