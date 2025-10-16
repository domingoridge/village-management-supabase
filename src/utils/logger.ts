/**
 * Logger Utility
 * Structured logging with different log levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger class with structured logging support
 */
export class Logger {
  private minLevel: LogLevel;
  private serviceName: string;

  constructor(serviceName: string = 'village-management', minLevel: LogLevel = LogLevel.INFO) {
    this.serviceName = serviceName;
    this.minLevel = minLevel;
  }

  /**
   * Sets the minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Creates a log entry object
   */
  private createLogEntry(
    level: string,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = {
        service: this.serviceName,
        ...context,
      };
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  /**
   * Outputs log entry to console
   */
  private output(entry: LogEntry): void {
    const formatted = JSON.stringify(entry);

    switch (entry.level) {
      case 'ERROR':
        console.error(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      case 'INFO':
        console.info(formatted);
        break;
      case 'DEBUG':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    if (this.minLevel <= LogLevel.DEBUG) {
      const entry = this.createLogEntry('DEBUG', message, context);
      this.output(entry);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    if (this.minLevel <= LogLevel.INFO) {
      const entry = this.createLogEntry('INFO', message, context);
      this.output(entry);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    if (this.minLevel <= LogLevel.WARN) {
      const entry = this.createLogEntry('WARN', message, context);
      this.output(entry);
    }
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (this.minLevel <= LogLevel.ERROR) {
      const entry = this.createLogEntry('ERROR', message, context, error);
      this.output(entry);
    }
  }

  /**
   * Creates a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.serviceName, this.minLevel);

    // Override output to include additional context
    const originalOutput = childLogger.output.bind(childLogger);
    childLogger.output = (entry: LogEntry) => {
      entry.context = {
        ...additionalContext,
        ...entry.context,
      };
      originalOutput(entry);
    };

    return childLogger;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger('village-management', LogLevel.INFO);

/**
 * Creates a request logger with request-specific context
 */
export function createRequestLogger(requestId: string, userId?: string): Logger {
  return logger.child({
    request_id: requestId,
    user_id: userId,
  });
}

/**
 * Creates a tenant-scoped logger
 */
export function createTenantLogger(tenantId: string, tenantName?: string): Logger {
  return logger.child({
    tenant_id: tenantId,
    tenant_name: tenantName,
  });
}

/**
 * Sets the global minimum log level
 */
export function setGlobalLogLevel(level: LogLevel): void {
  logger.setMinLevel(level);
}
