
type LogType = 'info' | 'warn' | 'error' | 'success' | 'system';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: LogType;
  message: string;
  details?: any;
}

type LogListener = (entry: LogEntry) => void;

class Logger {
  private listeners: LogListener[] = [];

  subscribe(listener: LogListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  log(type: LogType, message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message,
      details
    };
    this.listeners.forEach(l => l(entry));
    // Also log to console for devtools
    console.log(`[${type.toUpperCase()}] ${message}`, details || '');
  }

  info(message: string, details?: any) { this.log('info', message, details); }
  warn(message: string, details?: any) { this.log('warn', message, details); }
  error(message: string, details?: any) { this.log('error', message, details); }
  success(message: string, details?: any) { this.log('success', message, details); }
  system(message: string, details?: any) { this.log('system', message, details); }
}

export const logger = new Logger();
