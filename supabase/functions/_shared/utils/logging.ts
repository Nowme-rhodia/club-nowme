type LogLevel = 'info' | 'success' | 'warn' | 'error';

interface LogOptions {
  timestamp?: boolean;
  level?: boolean;
}

const defaultOptions: LogOptions = {
  timestamp: true,
  level: true,
};

class Logger {
  private options: LogOptions;

  constructor(options: LogOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];

    if (this.options.timestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (this.options.level) {
      parts.push(`[${level.toUpperCase()}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  info(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage('info', message), ...args);
  }

  success(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage('success', message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    console.error(this.formatMessage('error', message));

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    } else if (error) {
      console.error('Error details:', error);
    }

    if (args.length > 0) {
      console.error('Additional info:', ...args);
    }
  }
}

export const logger = new Logger();
