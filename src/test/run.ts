import { TestRunner } from './TestRunner';
import './game.test';
import './logging.test';
import './di.test';

// This test entry point runs under Node, not the browser. Declare the only
// Node global it uses so the browser-targeted tsconfig type-checks cleanly
// without pulling in @types/node.
declare const process: { exit(code?: number): never };

async function runTests(): Promise<void>
{
  const result = await new TestRunner().run();

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${result.total} | Passed: ${result.passed} | Failed: ${result.failed}`);
  console.log('='.repeat(60));

  if (result.failed > 0)
  {
    console.log('\nFailures:');
    for (const error of result.errors)
    {
      console.error(`  ${error.test}: ${error.message}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

void runTests();
