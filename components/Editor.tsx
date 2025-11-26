import React, { useRef } from 'react';

interface EditorProps {
  code: string;
  onChange: (newCode: string) => void;
  fontFamily: string;
  fontSize: number;
}

export const Editor: React.FC<EditorProps> = ({ code, onChange, fontFamily, fontSize }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textAreaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
    }
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 15) }, (_, i) => i + 1);

  // Simple auto-indent handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      
      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        if(textAreaRef.current) {
            textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const style = {
      fontFamily: fontFamily,
      fontSize: `${fontSize}px`,
      lineHeight: '1.6'
  };

  return (
    <div className="flex h-full w-full bg-surface-1-light dark:bg-surface-1-dark group transition-colors">
      {/* Line Numbers */}
      <div 
        ref={lineNumbersRef}
        className="min-w-[48px] bg-surface-2-light dark:bg-surface-2-dark border-r border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-right pr-3 pt-4 select-none overflow-hidden transition-colors"
        style={style}
      >
        {lineNumbers.map(n => (
          <div key={n}>{n}</div>
        ))}
      </div>
      
      {/* Text Area */}
      <textarea
        ref={textAreaRef}
        className="flex-1 p-4 outline-none resize-none whitespace-pre text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 bg-transparent transition-colors"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        style={style}
        placeholder={`/* \n   Welcome to SAS Studio M3.\n   Start typing your SAS code here...\n*/`}
      />
    </div>
  );
};