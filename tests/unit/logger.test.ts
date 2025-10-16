/**
 * Unit Tests: Logger Utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel, createRequestLogger, createTenantLogger } from '../../src/utils/logger';

describe('Logger Utility', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Logging', () => {
    it('should log info messages', () => {
      const logger = new Logger('test-service', LogLevel.INFO);
      logger.info('Test info message');

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(loggedData.level).toBe('INFO');
      expect(loggedData.message).toBe('Test info message');
      expect(loggedData.timestamp).toBeDefined();
    });

    it('should log error messages with error object', () => {
      const logger = new Logger('test-service', LogLevel.INFO);
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedData.level).toBe('ERROR');
      expect(loggedData.message).toBe('Error occurred');
      expect(loggedData.error).toBeDefined();
      expect(loggedData.error.message).toBe('Test error');
      expect(loggedData.error.stack).toBeDefined();
    });

    it('should log warning messages', () => {
      const logger = new Logger('test-service', LogLevel.INFO);
      logger.warn('Test warning');

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(loggedData.level).toBe('WARN');
      expect(loggedData.message).toBe('Test warning');
    });

    it('should log debug messages when level is DEBUG', () => {
      const logger = new Logger('test-service', LogLevel.DEBUG);
      logger.debug('Test debug message');

      expect(consoleDebugSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(loggedData.level).toBe('DEBUG');
      expect(loggedData.message).toBe('Test debug message');
    });
  });

  describe('Log Levels', () => {
    it('should not log debug messages when level is INFO', () => {
      const logger = new Logger('test-service', LogLevel.INFO);
      logger.debug('This should not be logged');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should not log info messages when level is WARN', () => {
      const logger = new Logger('test-service', LogLevel.WARN);
      logger.info('This should not be logged');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should only log errors when level is ERROR', () => {
      const logger = new Logger('test-service', LogLevel.ERROR);
      logger.debug('Not logged');
      logger.info('Not logged');
      logger.warn('Not logged');
      logger.error('This is logged');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
    });
  });

  describe('Context Logging', () => {
    it('should include context in log entries', () => {
      const logger = new Logger('test-service', LogLevel.INFO);
      logger.info('Message with context', {
        user_id: '123',
        action: 'login',
      });

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(loggedData.context).toBeDefined();
      expect(loggedData.context.service).toBe('test-service');
      expect(loggedData.context.user_id).toBe('123');
      expect(loggedData.context.action).toBe('login');
    });

    it('should include service name in context', () => {
      const logger = new Logger('custom-service', LogLevel.INFO);
      logger.info('Test message', { key: 'value' });

      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(loggedData.context.service).toBe('custom-service');
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with additional context', () => {
      const parentLogger = new Logger('parent-service', LogLevel.INFO);
      const childLogger = parentLogger.child({
        request_id: 'req-123',
        user_id: 'user-456',
      });

      childLogger.info('Child log message');

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(loggedData.context.request_id).toBe('req-123');
      expect(loggedData.context.user_id).toBe('user-456');
      expect(loggedData.context.service).toBe('parent-service');
    });

    it('should merge child context with message context', () => {
      const parentLogger = new Logger('test-service', LogLevel.INFO);
      const childLogger = parentLogger.child({ request_id: 'req-123' });

      childLogger.info('Test message', { action: 'create' });

      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(loggedData.context.request_id).toBe('req-123');
      expect(loggedData.context.action).toBe('create');
    });
  });

  describe('Helper Functions', () => {
    it('should create request logger with request context', () => {
      const requestLogger = createRequestLogger('req-789', 'user-101');
      requestLogger.info('Request received');

      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(loggedData.context.request_id).toBe('req-789');
      expect(loggedData.context.user_id).toBe('user-101');
    });

    it('should create tenant logger with tenant context', () => {
      const tenantLogger = createTenantLogger('tenant-001', 'Test Community');
      tenantLogger.info('Tenant operation');

      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(loggedData.context.tenant_id).toBe('tenant-001');
      expect(loggedData.context.tenant_name).toBe('Test Community');
    });
  });

  describe('Error Logging', () => {
    it('should capture error stack trace', () => {
      const logger = new Logger('test-service', LogLevel.INFO);
      const error = new Error('Test error with stack');
      logger.error('Error message', error);

      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedData.error.stack).toContain('Error: Test error with stack');
    });

    it('should handle errors without context', () => {
      const logger = new Logger('test-service', LogLevel.INFO);
      const error = new Error('Simple error');
      logger.error('Error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedData.error).toBeDefined();
      expect(loggedData.message).toBe('Error occurred');
    });

    it('should handle errors with context', () => {
      const logger = new Logger('test-service', LogLevel.INFO);
      const error = new Error('Contextual error');
      logger.error('Error with context', error, {
        operation: 'database_query',
        table: 'users',
      });

      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedData.error).toBeDefined();
      expect(loggedData.context.operation).toBe('database_query');
      expect(loggedData.context.table).toBe('users');
    });
  });

  describe('Timestamp', () => {
    it('should include ISO timestamp in log entries', () => {
      const logger = new Logger('test-service', LogLevel.INFO);
      logger.info('Test message');

      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(loggedData.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });
});
