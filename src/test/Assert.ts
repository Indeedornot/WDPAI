export class Assert
{
  static assertEquals<T>(actual: T, expected: T, message: string): void
  {
    if (actual !== expected)
    {
      throw new Error(`Assertion failed: expected ${expected}, got ${actual} — ${message}`);
    }
  }

  static assertStrictEquals<T>(actual: T, expected: T, message: string): void
  {
    if (!Object.is(actual, expected))
    {
      throw new Error(`Assertion failed: expected ${expected}, got ${actual} (strict) — ${message}`);
    }
  }

  static assertTrue(condition: boolean, message: string): void
  {
    if (!condition)
    {
      throw new Error(`Assertion failed: expected true — ${message}`);
    }
  }

  static assertFalse(condition: boolean, message: string): void
  {
    if (condition)
    {
      throw new Error(`Assertion failed: expected false — ${message}`);
    }
  }

  static assertNull(value: unknown, message: string): void
  {
    if (value !== null)
    {
      throw new Error(`Assertion failed: expected null, got ${value} — ${message}`);
    }
  }

  static assertNotNull(value: unknown, message: string): void
  {
    if (value === null)
    {
      throw new Error(`Assertion failed: expected not null — ${message}`);
    }
  }

  static assertThrows(fn: () => void, message: string): void
  {
    try
    {
      fn();
      throw new Error(`Assertion failed: expected exception — ${message}`);
    }
    catch (e)
    {
      if (e instanceof Error && e.message.startsWith('Assertion failed'))
      {
        throw e;
      }
    }
  }

  static fail(message: string): never
  {
    throw new Error(`Test failed: ${message}`);
  }
}
