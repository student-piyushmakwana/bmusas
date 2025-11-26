import React from 'react';
import { TabType } from '../types';

interface OutputPanelProps {
  activeTab: TabType;
  log: string;
  results: string;
  fontFamily: string;
  fontSize: number;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({ activeTab, log, results, fontFamily, fontSize }) => {
  return (
    <div className="flex-1 overflow-auto bg-surface-1-light dark:bg-surface-1-dark transition-colors text-sm">
        
        {/* LOG VIEW */}
        {activeTab === TabType.LOG && (
            <div 
                className="p-4 whitespace-pre-wrap"
                style={{ fontFamily: fontFamily, fontSize: `${fontSize}px` }}
            >
                {log ? (
                    log.split('\n').map((line, i) => {
                        let colorClass = 'text-slate-700 dark:text-slate-300';
                        if (line.startsWith('ERROR')) colorClass = 'text-red-600 dark:text-red-400 font-bold';
                        else if (line.startsWith('WARNING')) colorClass = 'text-amber-600 dark:text-amber-400 font-bold';
                        else if (line.startsWith('NOTE')) colorClass = 'text-blue-600 dark:text-blue-400';
                        
                        return <div key={i} className={colorClass}>{line}</div>
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center mt-10 text-slate-400 dark:text-slate-500 italic font-mono">
                        <span className="material-symbols-rounded text-4xl mb-2 opacity-50">article</span>
                        No log available.
                    </div>
                )}
            </div>
        )}

        {/* RESULTS VIEW */}
        {activeTab === TabType.RESULTS && (
            <div className="p-8">
                {results ? (
                     <div 
                        className="sas-results"
                        dangerouslySetInnerHTML={{ __html: results }} 
                     />
                ) : (
                     <div className="flex flex-col items-center justify-center mt-10 text-slate-400 dark:text-slate-500 font-mono">
                        <span className="material-symbols-rounded text-4xl mb-2 opacity-50">analytics</span>
                        <p>No results generated.</p>
                     </div>
                )}
            </div>
        )}

        {/* OUTPUT DATA VIEW (MOCK) */}
        {activeTab === TabType.OUTPUT_DATA && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 font-mono">
                 <span className="material-symbols-rounded text-4xl mb-2 opacity-50">view_module</span>
                 <p>Output Data Set Explorer (Not connected)</p>
            </div>
        )}
    </div>
  );
};