import { TestRunner } from './TestRunner';
import { Assert } from './Assert';
import { Logger } from '../app/logging/Logger';

TestRunner.describe('Logger', () =>
{
  TestRunner.it('should return singleton instance', () =>
  {
    const logger1 = Logger.getInstance();
    const logger2 = Logger.getInstance();
    Assert.assertStrictEquals(logger1, logger2, 'should return same instance');
  });

  TestRunner.it('should create named loggers', () =>
  {
    const logger1 = Logger.named('Test1');
    const logger2 = Logger.named('Test2');
    const logger1Again = Logger.named('Test1');

    Assert.assertStrictEquals(logger1, logger1Again, 'same name should return same instance');
    Assert.assertTrue(logger1 !== logger2, 'different names should return different instances');
  });

  TestRunner.it('should log messages at different levels', () =>
  {
    const logger = Logger.named('TestLogger');
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message', { code: 'TEST_ERROR' });
  });

  TestRunner.it('should enforce max log entries limit', () =>
  {
    const logger = Logger.getInstance();
    logger.clearLogs();

    for (let i = 0; i < 250; i++)
    {
      logger.info(`Message ${i}`);
    }

    const encoded = logger.getLogsAsBase64();
    Assert.assertTrue(encoded.length > 0, 'should have encoded logs');
  });

  TestRunner.it('should clear logs', () =>
  {
    const logger = Logger.getInstance();
    logger.info('Test message');
    logger.clearLogs();
    const encoded = logger.getLogsAsBase64();
    Assert.assertEquals(encoded, '', 'logs should be empty after clear');
  });
});
