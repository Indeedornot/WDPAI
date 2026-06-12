export type TestFn = () => void | Promise<void>;

export interface TestSuite
{
  name: string;
  tests: Test[];
}

export interface Test
{
  name: string;
  fn: TestFn;
  suite: string;
}

export class TestRunner
{
  private static _tests: Test[] = [];
  private static _currentSuite = 'default';

  static describe(name: string, fn: () => void): void
  {
    const prevSuite = this._currentSuite;
    this._currentSuite = name;
    fn();
    this._currentSuite = prevSuite;
  }

  static it(name: string, fn: TestFn): void
  {
    TestRunner._tests.push({
      name,
      fn,
      suite: this._currentSuite,
    });
  }

  static test(name: string, fn: TestFn): void
  {
    this.it(name, fn);
  }

  async run(): Promise<TestResult>
  {
    const result: TestResult = {
      total: TestRunner._tests.length,
      passed: 0,
      failed: 0,
      errors: [],
    };

    for (const test of TestRunner._tests)
    {
      try
      {
        await test.fn();
        result.passed++;
        TestRunner._log(`✓ ${test.suite} > ${test.name}`);
      }
      catch (e)
      {
        result.failed++;
        const message = e instanceof Error ? e.message : String(e);
        result.errors.push({ test: `${test.suite} > ${test.name}`, message });
        TestRunner._log(`✗ ${test.suite} > ${test.name}`);
        TestRunner._log(`  ${message}`);
      }
    }

    return result;
  }

  private static _log(message: string): void
  {
    console.log(message);
  }
}

export interface TestResult
{
  total: number;
  passed: number;
  failed: number;
  errors: Array<{ test: string; message: string }>;
}
