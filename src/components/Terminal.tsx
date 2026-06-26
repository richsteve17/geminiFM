import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../utils/logger';

interface TerminalProps {
  logs: LogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ logs, isOpen, onClose }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 h-1/3 bg-black/95 border-t-2 border-green-500 z-50 font-mono text-xs p-4 overflow-hidden flex flex-col shadow-2xl backdrop-blur-sm">
      <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
        <span className="text-green-500 font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          TERMINAL_OUTPUT // GEMINI-3-FLASH-PREVIEW
        </span>
        <div className="flex gap-4">
             <span className="text-gray-600 text-[10px] uppercase tracking-widest self-center">Live Stream</span>
            <button onClick={onClose} className="text-gray-500 hover:text-white">[CLOSE]</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 font-mono">
        {logs.length === 0 && <div className="text-gray-600 italic">Waiting for system events...</div>}
        {logs.map(log => (
          <div key={log.id} className="flex gap-2 hover:bg-white/5 p-0.5 rounded">
            <span className="text-gray-600 shrink-0">[{log.timestamp.toLocaleTimeString()}]</span>
            <span className={`shrink-0 font-bold w-16
              ${log.type === 'error' ? 'text-red-500' : ''}
              ${log.type === 'warn' ? 'text-yellow-500' : ''}
              ${log.type === 'success' ? 'text-green-400' : ''}
              ${log.type === 'system' ? 'text-blue-400' : ''}
              ${log.type === 'info' ? 'text-gray-300' : ''}
            `}>
              {log.type.toUpperCase()}
            </span>
            <span className="text-gray-300 break-all">{log.message}</span>
            {log.details && (
              <span className="text-gray-500 italic truncate max-w-xs">
                {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
              </span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Terminal;
