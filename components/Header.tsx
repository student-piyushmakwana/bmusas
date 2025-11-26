import React from 'react';

interface HeaderProps {
  onRun: () => void;
  onNewProgram: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
  onProfileClick: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isRunning: boolean;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    onRun, 
    onNewProgram, 
    onSave, 
    onUndo, 
    onRedo, 
    onOpenSettings,
    onProfileClick,
    canUndo, 
    canRedo,
    isRunning, 
    isDarkMode, 
    toggleTheme 
}) => {
  return (
    <header className="flex items-center justify-between py-2 px-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-surface-1-light dark:bg-surface-1-dark transition-colors">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-container-light dark:bg-primary-container-dark text-on-primary-container-light dark:text-on-primary-container-dark rounded-full flex items-center justify-center">
                <span className="material-symbols-rounded">grid_view</span>
            </div>
            <div>
                <h1 className="font-bold text-lg text-slate-900 dark:text-slate-50 leading-tight">SAS Studio</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wider -mt-0.5">M3 EDITION</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>
            
            <div className="flex items-center gap-1">
                <button 
                    onClick={onNewProgram}
                    className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 transition-colors"
                >
                    <span className="material-symbols-rounded text-xl text-slate-600 dark:text-slate-300">add</span>
                    New
                </button>
                <button 
                    onClick={onSave}
                    className="p-2.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Save"
                >
                    <span className="material-symbols-rounded">save</span>
                </button>
                <button 
                    onClick={onRun}
                    disabled={isRunning}
                    className={`
                        font-bold text-sm px-5 py-2 rounded-full flex items-center gap-2 transition-all ml-2
                        ${isRunning 
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                            : 'bg-primary-light dark:bg-primary-dark text-white dark:text-slate-900 hover:opacity-90 shadow-sm'
                        }
                    `}
                >
                    <span className={`material-symbols-rounded text-lg ${isRunning ? 'animate-spin' : ''}`}>
                        {isRunning ? 'refresh' : 'play_arrow'}
                    </span>
                    {isRunning ? 'Running' : 'Run'}
                </button>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={toggleTheme}
                className="text-slate-500 dark:text-slate-400 p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title={isDarkMode ? "Light Mode" : "Dark Mode"}
            >
                <span className="material-symbols-rounded">
                    {isDarkMode ? 'light_mode' : 'dark_mode'}
                </span>
            </button>
            
            <div className="flex items-center bg-surface-2-light dark:bg-surface-2-dark rounded-full hidden sm:flex">
                <button 
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`
                        p-2.5 rounded-l-full transition-colors
                        ${canUndo 
                            ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/50' 
                            : 'text-slate-300 dark:text-slate-600 cursor-default'}
                    `}
                    title="Undo"
                >
                    <span className="material-symbols-rounded text-xl">undo</span>
                </button>
                <button 
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`
                        p-2.5 transition-colors
                        ${canRedo 
                            ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/50' 
                            : 'text-slate-300 dark:text-slate-600 cursor-default'}
                    `}
                    title="Redo"
                >
                    <span className="material-symbols-rounded text-xl">redo</span>
                </button>
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>
                <button 
                    onClick={onOpenSettings}
                    className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/50 rounded-r-full transition-colors"
                    title="Settings"
                >
                    <span className="material-symbols-rounded text-xl">settings</span>
                </button>
            </div>
            
            <button 
                onClick={onProfileClick}
                className="ml-2 focus:outline-none rounded-full transition-transform active:scale-95"
            >
                <img 
                    alt="User avatar" 
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 hover:border-primary-light dark:hover:border-primary-dark transition-colors" 
                    src="https://i.pinimg.com/564x/24/38/64/243864d44e26eb18dd1f0664aac4f7b2.jpg"
                />
            </button>
        </div>
    </header>
  );
};