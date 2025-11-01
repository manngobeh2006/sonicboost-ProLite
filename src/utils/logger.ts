import { logBreadcrumb, logError as sentryLogError } from './sentry';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private context: LogContext = {};

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  private log(level: LogLevel, message: string, data?: LogContext) {
    const timestamp = new Date().toISOString();
    const fullContext = { ...this.context, ...data, timestamp };

    // Console output
    const emoji = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
    };

    const prefix = `${emoji[level]} [${level.toUpperCase()}]`;
    
    if (__DEV__) {
      console.log(prefix, message, fullContext);
    }

    // Send to Sentry as breadcrumb (except errors, those use captureException)
    if (level !== LogLevel.ERROR) {
      logBreadcrumb(message, level, fullContext);
    }
  }

  debug(message: string, data?: LogContext) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: LogContext) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: LogContext) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | any, data?: LogContext) {
    this.log(LogLevel.ERROR, message, { ...data, error: error?.message || error });
    
    // Send actual error to Sentry
    if (error instanceof Error) {
      sentryLogError(error, { ...this.context, ...data, message });
    } else if (error) {
      sentryLogError(new Error(message), { ...this.context, ...data, originalError: error });
    }
  }

  // Measure operation time
  async measure<T>(
    operationName: string,
    fn: () => Promise<T>,
    data?: LogContext
  ): Promise<T> {
    const startTime = Date.now();
    this.info(`Starting: ${operationName}`, data);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.info(`Completed: ${operationName}`, { ...data, duration });
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.error(`Failed: ${operationName}`, error, { ...data, duration });
      throw error;
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const logDebug = (message: string, data?: LogContext) => logger.debug(message, data);
export const logInfo = (message: string, data?: LogContext) => logger.info(message, data);
export const logWarn = (message: string, data?: LogContext) => logger.warn(message, data);
export const logError = (message: string, error?: Error | any, data?: LogContext) =>
  logger.error(message, error, data);
export const measureOperation = <T>(
  operationName: string,
  fn: () => Promise<T>,
  data?: LogContext
) => logger.measure(operationName, fn, data);
