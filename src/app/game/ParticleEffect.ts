import { GameObject } from '../../engine/core/GameObject';
import { Vec2 } from '../../engine/math/Vec2';
import { SpriteRenderer2D } from '../../engine/render/SpriteRenderer2D';
import { Mover2D } from '../../engine/components/Mover2D';
import { Lifetime } from '../../engine/components/Lifetime';

export class ParticleEffect
{
  static createKillExplosion(pos: Vec2, color: string): GameObject[]
  {
    const particles: GameObject[] = [];
    const particleCount = 8;

    for (let i = 0; i < particleCount; i++)
    {
      const go = new GameObject(`Particle${i}`);
      go.transform.position.set(pos.x, pos.y);

      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 200 + Math.random() * 100;
      go.addComponent(
        new SpriteRenderer2D({
          size: new Vec2(6, 6),
          color,
          strokeColor: 'transparent',
          shape: 'circle',
          label: '',
        }),
      );

      const mover = go.addComponent(new Mover2D());
      mover.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed);

      go.addComponent(new Lifetime({ seconds: 0.6 }));

      particles.push(go);
    }

    return particles;
  }

  static createHitFlash(pos: Vec2): GameObject
  {
    const go = new GameObject('HitFlash');
    go.transform.position.set(pos.x, pos.y);

    go.addComponent(
      new SpriteRenderer2D({
        size: new Vec2(40, 40),
        color: '#fbbf24',
        strokeColor: 'transparent',
        shape: 'circle',
        label: '',
      }),
    );

    go.addComponent(new Lifetime({ seconds: 0.3 }));

    return go;
  }

  static createFloatingText(pos: Vec2, text: string, color: string): GameObject
  {
    const go = new GameObject('FloatingText');
    go.transform.position.set(pos.x, pos.y);

    const mover = go.addComponent(new Mover2D());
    mover.velocity.set(0, -100);

    go.addComponent(
      new SpriteRenderer2D({
        size: new Vec2(30, 20),
        color,
        strokeColor: 'transparent',
        shape: 'rect',
        label: text,
      }),
    );

    go.addComponent(new Lifetime({ seconds: 1 }));

    return go;
  }
}
