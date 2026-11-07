import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { LogEntry } from '../utils/logger';

interface TerminalProps { logs: LogEntry[]; isOpen: boolean; onClose: () => void; }
const Terminal: React.FC<TerminalProps> = ({ logs, isOpen, onClose }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (isOpen && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [logs, isOpen]);
  if (!isOpen) return null;
  return (
    <section className="fm-terminal fm-inverse fixed inset-x-0 bottom-0 z-50 font-mono text-xs flex flex-col" aria-label="System log">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
        <span className="fm-eyebrow">System log / Runtime events</span>
        <button type="button" onClick={onClose} className="fm-button-secondary" aria-label="Close system log"><X size={15} aria-hidden="true" />Close</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 font-mono">
        {logs.length === 0 && <div className="text-gray-400 italic">Waiting for system events...</div>}
        {logs.map(log => (
          <div key={log.id} className="flex gap-2 p-0.5">
            <span className="text-gray-400 shrink-0">[{log.timestamp.toLocaleTimeString()}]</span>
            <span className={`shrink-0 font-bold w-16 ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : log.type === 'success' ? 'text-green-400' : log.type === 'system' ? 'text-blue-400' : 'text-gray-300'}`}>{log.type.toUpperCase()}</span>
            <span className="text-gray-300 break-all">{log.message}</span>
            {log.details && <span className="text-gray-400 italic truncate max-w-xs">{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</span>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  );
};
export default Terminal;
