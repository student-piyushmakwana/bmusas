import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { OutputPanel } from './components/OutputPanel';
import { INITIAL_FILES } from './constants';
import { FileNode, TabType } from './types';
import { executeSasCode, generateSasCode } from './services/gemini';

const FONTS = [
    { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
    { name: 'Fira Code', value: "'Fira Code', monospace" },
    { name: 'Cascadia Code', value: "'Cascadia Code', 'Segoe UI Mono', monospace" },
    { name: 'Consolas', value: "Consolas, monospace" },
    { name: 'Source Code Pro', value: "'Source Code Pro', monospace" },
    { name: 'Iosevka', value: "Iosevka, monospace" },
    { name: 'Victor Mono', value: "'Victor Mono', monospace" },
    { name: 'Roboto Mono', value: "'Roboto Mono', monospace" },
    { name: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace" },
    { name: 'Monaco', value: "Monaco, monospace" },
];

const App: React.FC = () => {
  // Initialize files
  const [files, setFiles] = useState<FileNode[]>(() => {
    try {
      const savedFiles = localStorage.getItem('sas_studio_files');
      return savedFiles ? JSON.parse(savedFiles) : INITIAL_FILES;
    } catch (error) {
      console.error('Failed to load files:', error);
      return INITIAL_FILES;
    }
  });

  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
     return localStorage.getItem('sas_studio_active_id') || null;
  });

  const [openFiles, setOpenFiles] = useState<string[]>(() => {
     const savedOpen = localStorage.getItem('sas_studio_open_files');
     const initial = savedOpen ? JSON.parse(savedOpen) : [];
     const active = localStorage.getItem('sas_studio_active_id');
     if (active && !initial.includes(active)) {
         initial.push(active);
     }
     return initial;
  });

  useEffect(() => {
    localStorage.setItem('sas_studio_open_files', JSON.stringify(openFiles));
  }, [openFiles]);
  
  // Theme & Appearance State
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('sas_studio_theme_mode') === 'dark');
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('sas_studio_font_family') || FONTS[0].value);
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('sas_studio_font_size') || '14'));
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => localStorage.getItem('sas_studio_autosave') === 'true');
  const [isVibeCodingEnabled, setIsVibeCodingEnabled] = useState(() => localStorage.getItem('sas_studio_vibe_coding') === 'true');

  // Persist settings
  useEffect(() => localStorage.setItem('sas_studio_theme_mode', isDarkMode ? 'dark' : 'light'), [isDarkMode]);
  useEffect(() => localStorage.setItem('sas_studio_font_family', fontFamily), [fontFamily]);
  useEffect(() => localStorage.setItem('sas_studio_font_size', fontSize.toString()), [fontSize]);
  useEffect(() => localStorage.setItem('sas_studio_autosave', String(autoSaveEnabled)), [autoSaveEnabled]);
  useEffect(() => localStorage.setItem('sas_studio_vibe_coding', String(isVibeCodingEnabled)), [isVibeCodingEnabled]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Apply Theme Mode class
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showSnackbar = (message: string, type: 'success' | 'error' = 'error') => {
      setSnackbar({ message, type });
      setTimeout(() => setSnackbar(null), 3000);
  };

  // Settings Dialog
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  // Editor State
  const [code, setCode] = useState<string>('');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedCodeRef = useRef<string>('');

  const [log, setLog] = useState<string>('');
  const [results, setResults] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<TabType>(TabType.LOG);

  // Vibe Coding State
  const [vibePrompt, setVibePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Resize State
  const [outputHeight, setOutputHeight] = useState(45); 
  const [isDragging, setIsDragging] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !contentRef.current) return;
      const containerRect = contentRef.current.getBoundingClientRect();
      const newHeight = ((containerRect.bottom - e.clientY) / containerRect.height) * 100;
      setOutputHeight(Math.min(Math.max(newHeight, 10), 85));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const findFile = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFile(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  
  const findContent = (nodes: FileNode[], id: string): string => {
      const node = findFile(nodes, id);
      return node?.content || '';
  };

  const handleSave = useCallback((silent: boolean = false) => {
    if (!activeFileId) return;
    const updateFilesRecursive = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
            if (node.id === activeFileId) return { ...node, content: code };
            if (node.children) return { ...node, children: updateFilesRecursive(node.children) };
            return node;
        });
    };
    setFiles(prevFiles => {
        const filesToSave = updateFilesRecursive(prevFiles);
        try {
            localStorage.setItem('sas_studio_files', JSON.stringify(filesToSave));
            localStorage.setItem('sas_studio_active_id', activeFileId);
            if (!silent) showSnackbar("Saved successfully", 'success');
        } catch (e) {
             if (!silent) showSnackbar("Error saving", 'error');
        }
        return filesToSave;
    });
  }, [activeFileId, code]);

  useEffect(() => {
    if (!autoSaveEnabled || !activeFileId) return;
    const timeoutId = setTimeout(() => handleSave(true), 2000);
    return () => clearTimeout(timeoutId);
  }, [code, autoSaveEnabled, activeFileId, handleSave]);

  useEffect(() => {
    if (activeFileId) {
        const content = findContent(files, activeFileId);
        setCode(content);
        setUndoStack([]);
        setRedoStack([]);
        lastSavedCodeRef.current = content;
    } else {
        setCode('');
        setUndoStack([]);
        setRedoStack([]);
        lastSavedCodeRef.current = '';
    }
  }, [activeFileId]);

  const handleCodeChange = (newCode: string) => {
      setCode(newCode);
      if (redoStack.length > 0) setRedoStack([]);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
           setUndoStack(prev => [...prev, lastSavedCodeRef.current]);
           lastSavedCodeRef.current = newCode;
      }, 700);
  };

  const handleUndo = () => {
      if (undoStack.length === 0) return;
      const previous = undoStack[undoStack.length - 1];
      setRedoStack(prev => [code, ...prev]);
      setUndoStack(prev => prev.slice(0, -1));
      setCode(previous);
      lastSavedCodeRef.current = previous;
  };

  const handleRedo = () => {
      if (redoStack.length === 0) return;
      const next = redoStack[0];
      setUndoStack(prev => [...prev, code]);
      setRedoStack(prev => prev.slice(1));
      setCode(next);
      lastSavedCodeRef.current = next;
  };

  const updateFileContent = (id: string, newContent: string) => {
      setFiles(prevFiles => {
          const updateRecursive = (nodes: FileNode[]): FileNode[] => {
              return nodes.map(node => {
                  if (node.id === id) return { ...node, content: newContent };
                  if (node.children) return { ...node, children: updateRecursive(node.children) };
                  return node;
              });
          };
          return updateRecursive(prevFiles);
      });
  };

  const handleFileSelect = useCallback((file: FileNode) => {
    if (activeFileId && activeFileId !== file.id) updateFileContent(activeFileId, code);
    if (!openFiles.includes(file.id)) setOpenFiles(prev => [...prev, file.id]);
    setActiveFileId(file.id);
  }, [activeFileId, code, openFiles]);

  const handleTabClick = (fileId: string) => {
      if (fileId === activeFileId) return;
      if (activeFileId) updateFileContent(activeFileId, code);
      setActiveFileId(fileId);
  };

  const handleCloseTab = (e: React.MouseEvent, fileId: string) => {
      e.stopPropagation();
      const newOpenFiles = openFiles.filter(id => id !== fileId);
      setOpenFiles(newOpenFiles);
      if (activeFileId === fileId) {
          updateFileContent(fileId, code);
          if (newOpenFiles.length > 0) setActiveFileId(newOpenFiles[newOpenFiles.length - 1]);
          else setActiveFileId(null);
      }
  };

  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateFile = () => {
    const trimmedName = newFileName.trim();
    if (!trimmedName) return showSnackbar("Enter a file name");
    const finalName = trimmedName.endsWith('.sas') ? trimmedName : `${trimmedName}.sas`;
    const newId = `file_${Date.now()}`;
    const newFile: FileNode = { id: newId, name: finalName, type: 'file', content: '' };

    if (activeFileId) updateFileContent(activeFileId, code);

    setFiles(prev => {
         const addRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
                if (node.id === 'myfolders') return { ...node, children: [...(node.children || []), newFile] };
                if (node.children) return { ...node, children: addRecursive(node.children) };
                return node;
            });
        };
        return addRecursive(prev);
    });

    setOpenFiles(prev => [...prev, newId]);
    setActiveFileId(newId);
    setResults(''); setLog(''); setIsNewFileDialogOpen(false);
  };

  const handleRun = useCallback(async () => {
    if (!code.trim() || !activeFileId) return;
    setIsRunning(true);
    setActiveBottomTab(TabType.LOG);
    setLog("Running...\n\nNOTE: Submitting statements...");
    setResults("");
    try {
      const output = await executeSasCode(code);
      setLog(output.log);
      setResults(output.results);
      if (output.results && !output.results.includes("No output generated")) setActiveBottomTab(TabType.RESULTS);
    } catch (e) { setLog(`ERROR: Application error.\n${e}`); } 
    finally { setIsRunning(false); }
  }, [code, activeFileId]);

  const handleVibeGenerate = async () => {
      if (!vibePrompt.trim()) return;
      setIsGenerating(true);
      try {
          const generatedCode = await generateSasCode(vibePrompt, code);
          const newCode = code ? `${code}\n\n${generatedCode}` : generatedCode;
          handleCodeChange(newCode);
          setVibePrompt('');
          showSnackbar("Code generated successfully", 'success');
      } catch (e) {
          showSnackbar("Failed to generate code", 'error');
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="flex flex-col h-screen bg-surface-1-light dark:bg-surface-1-dark text-slate-800 dark:text-slate-200 transition-colors">
      <Header 
        onRun={handleRun} 
        isRunning={isRunning} 
        onNewProgram={() => {setNewFileName(''); setIsNewFileDialogOpen(true);}}
        onSave={() => handleSave(false)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onProfileClick={() => setIsProfileDialogOpen(true)}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar files={files} onFileSelect={handleFileSelect} selectedFileId={activeFileId} />
        
        <main className="flex-grow flex flex-col p-4 bg-surface-1-light dark:bg-surface-1-dark min-w-0">
            {openFiles.length > 0 ? (
                <div 
                    ref={contentRef}
                    className="flex-grow flex flex-col bg-surface-3-light dark:bg-surface-3-dark rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-800 relative"
                >
                    {/* File Tabs */}
                    <div className="flex border-b border-slate-300 dark:border-slate-700/80 bg-surface-2-light dark:bg-surface-2-dark overflow-x-auto">
                        {openFiles.map(fileId => {
                            const fileNode = findFile(files, fileId);
                            if (!fileNode) return null;
                            const isActive = fileId === activeFileId;
                            return (
                                <button
                                    key={fileId}
                                    onClick={() => handleTabClick(fileId)}
                                    className={`
                                        flex items-center gap-2 py-3 px-4 border-b-2 text-sm transition-colors min-w-[120px] max-w-[200px] shrink-0
                                        ${isActive 
                                            ? 'border-primary-light dark:border-primary-dark bg-primary-container-light/30 dark:bg-primary-container-dark/30 text-slate-900 dark:text-slate-100 font-bold' 
                                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-300/40 dark:hover:bg-slate-800/50'
                                        }
                                    `}
                                >
                                    <span className={`material-symbols-rounded text-base ${isActive ? 'text-primary-light dark:text-primary-dark' : ''}`}>description</span>
                                    <span className="truncate">{fileNode.name}</span>
                                    <span 
                                        onClick={(e) => handleCloseTab(e, fileId)}
                                        className="material-symbols-rounded text-slate-400 dark:text-slate-500 text-sm ml-auto hover:text-red-500 rounded-full"
                                    >
                                        close
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        <div className="flex-1 min-h-[20%] overflow-hidden relative">
                            <Editor 
                                code={code} 
                                onChange={handleCodeChange} 
                                fontFamily={fontFamily}
                                fontSize={fontSize}
                            />
                        </div>
                        
                        <div 
                            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
                            className={`h-1.5 w-full flex items-center justify-center cursor-row-resize bg-surface-2-light dark:bg-surface-2-dark hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors z-10 border-y border-slate-200 dark:border-slate-700`}
                        >
                             <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                        </div>

                        <div style={{ height: `${outputHeight}%` }} className="min-h-[10%] bg-surface-1-light dark:bg-surface-1-dark flex flex-col">
                            <OutputPanel 
                                activeTab={activeBottomTab} 
                                log={log} 
                                results={results} 
                                fontFamily={fontFamily}
                                fontSize={fontSize}
                            />
                        </div>
                    </div>

                    {/* Vibe Coding Bar (Floating) */}
                    {isVibeCodingEnabled && (
                        <div className="absolute bottom-[60px] left-1/2 transform -translate-x-1/2 w-[90%] max-w-2xl z-30">
                            <div className={`
                                bg-white dark:bg-zinc-900/90 backdrop-blur-md rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700/50
                                flex items-center p-2 pl-3 transition-all duration-300
                                ${isGenerating ? 'ring-2 ring-blue-400 dark:ring-blue-500' : 'hover:shadow-2xl'}
                            `}>
                                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 shrink-0">
                                    <span className={`material-symbols-rounded text-xl ${isGenerating ? 'animate-spin' : ''}`}>
                                        {isGenerating ? 'refresh' : 'auto_awesome'}
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={vibePrompt}
                                    onChange={(e) => setVibePrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleVibeGenerate()}
                                    disabled={isGenerating}
                                    placeholder='provide me an context or automatically code generate'
                                    className="flex-1 bg-transparent border-none outline-none px-4 text-[15px] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 h-10 font-medium"
                                />
                                <button 
                                    onClick={handleVibeGenerate}
                                    disabled={!vibePrompt.trim() || isGenerating}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-50 transition-colors"
                                >
                                    <span className="material-symbols-rounded text-xl">arrow_upward</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Bottom Tabs */}
                    <div className="flex border-t border-slate-300 dark:border-slate-700/80 bg-surface-2-light dark:bg-surface-2-dark">
                        {[
                            { id: TabType.LOG, label: 'Log', icon: 'code' },
                            { id: TabType.RESULTS, label: 'Results', icon: 'assessment' },
                            { id: TabType.OUTPUT_DATA, label: 'Output Data', icon: 'view_module' }
                        ].map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveBottomTab(tab.id)}
                                className={`
                                    flex items-center gap-2 py-3 px-6 border-b-2 text-sm transition-colors
                                    ${activeBottomTab === tab.id
                                        ? 'border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark font-bold bg-primary-container-light/30 dark:bg-primary-container-dark/30'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-300/40 dark:hover:bg-slate-800/50'
                                    }
                                `}
                             >
                                <span className="material-symbols-rounded text-base">{tab.icon}</span>
                                <span>{tab.label}</span>
                             </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 bg-surface-3-light dark:bg-surface-3-dark rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="material-symbols-rounded text-6xl mb-4 opacity-20">grid_view</span>
                    <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300">No Program Open</h2>
                    <p className="mt-2 text-sm">Select a file from the explorer or create a new one.</p>
                </div>
            )}
        </main>
      </div>
      
      {/* Footer */}
      <footer className="flex items-center justify-between text-xs px-4 py-1.5 bg-surface-2-light dark:bg-surface-2-dark border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-primary-light animate-pulse' : 'bg-green-500'}`}></div>
            <span>{isRunning ? 'Running...' : 'Ready'}</span>
        </div>
        <div className="flex items-center gap-4 font-mono">
             <span>Ln {code.split('\n').length}, Col 1</span>
             <span>UTF-8</span>
             <span>SAS 9.4</span>
        </div>
      </footer>

      {/* New Program Dialog */}
      {isNewFileDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="w-full max-w-[440px] bg-surface-3-light dark:bg-surface-3-dark rounded-3xl p-8 shadow-2xl flex flex-col">
               <h2 className="text-2xl font-normal text-slate-900 dark:text-slate-100 mb-8">New Program</h2>
               
               <div className="relative mb-8 group">
                   <div className="flex items-center w-full border border-slate-400 dark:border-slate-600 rounded-lg px-4 py-3 focus-within:border-primary-light dark:focus-within:border-primary-dark focus-within:ring-1 focus-within:ring-primary-light dark:focus-within:ring-primary-dark transition-all">
                       <input 
                          type="text" 
                          className="w-full bg-transparent outline-none text-slate-900 dark:text-slate-100 text-base placeholder-slate-500"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          placeholder="Program name"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                       />
                       <span className="text-slate-500 text-base select-none">.sas</span>
                   </div>
               </div>

               <div className="flex justify-end gap-4 items-center">
                   <button 
                       onClick={() => setIsNewFileDialogOpen(false)} 
                       className="text-primary-light dark:text-primary-dark font-bold text-base px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                   >
                       Cancel
                   </button>
                   <button 
                       onClick={handleCreateFile} 
                       className="bg-primary-light dark:bg-primary-dark text-white dark:text-slate-900 font-bold text-base px-8 py-2.5 rounded-full hover:shadow-lg hover:opacity-90 transition-all"
                   >
                       Create
                   </button>
               </div>
           </div>
        </div>
      )}
      
      {/* Settings Dialog */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           {/* Container */}
           <div className="w-full max-w-lg rounded-3xl bg-surface-3-light dark:bg-surface-3-dark shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
               
               {/* Header */}
               <header className="flex items-start justify-between mb-8">
                    <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Settings</h1>
                    <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="p-1 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
               </header>

               <main className="space-y-8">
                   {/* Appearance */}
                   <section className="space-y-6">
                       <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Appearance</h2>
                       
                       {/* Theme Mode Toggle */}
                       <div className="flex items-center justify-between">
                           <p className="text-base text-zinc-700 dark:text-zinc-300">Theme Mode</p>
                           <div className="flex items-center space-x-1 bg-zinc-200/70 dark:bg-zinc-800 p-1 rounded-full">
                               <button 
                                  onClick={() => setIsDarkMode(false)}
                                  className={`px-4 py-1 text-sm font-bold rounded-full transition-all ${!isDarkMode ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500 hover:bg-zinc-100/50'}`}
                               >
                                   Light
                               </button>
                               <button 
                                  onClick={() => setIsDarkMode(true)}
                                  className={`px-4 py-1 text-sm font-bold rounded-full transition-all ${isDarkMode ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-700/50'}`}
                               >
                                   Dark
                               </button>
                           </div>
                       </div>
                   </section>

                   {/* Editor */}
                   <section className="space-y-6">
                       <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Editor</h2>
                       
                       {/* Vibe Coding Toggle */}
                        <div className="flex items-center justify-between">
                           <div>
                               <div className="flex items-center gap-2">
                                  <p className="text-base text-zinc-700 dark:text-zinc-300">Vibe Coding</p>
                                  <span className="material-symbols-rounded text-base text-purple-500">auto_awesome</span>
                               </div>
                               <p className="text-sm text-zinc-500 dark:text-zinc-400">Enable AI code generation assistant</p>
                           </div>
                           <button 
                               onClick={() => setIsVibeCodingEnabled(!isVibeCodingEnabled)}
                               className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 focus:ring-purple-500 ${isVibeCodingEnabled ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                           >
                               <span className="sr-only">Enable Vibe Coding</span>
                               <span 
                                 className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isVibeCodingEnabled ? 'translate-x-6' : 'translate-x-1'}`} 
                               />
                           </button>
                       </div>

                       {/* Font Size */}
                       <div className="flex items-center justify-between">
                           <p className="text-base text-zinc-700 dark:text-zinc-300">Font Size</p>
                           <div className="flex items-center space-x-4">
                               <input 
                                   type="range" 
                                   min="10" 
                                   max="24" 
                                   step="1" 
                                   value={fontSize}
                                   onChange={(e) => setFontSize(parseInt(e.target.value))}
                                   className="w-40 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-primary-light dark:accent-primary-dark"
                               />
                               <span className="text-sm text-zinc-500 dark:text-zinc-400 w-8 text-right font-mono">{fontSize}px</span>
                           </div>
                       </div>

                       {/* Auto-Save */}
                       <div className="flex items-center justify-between">
                           <div>
                               <p className="text-base text-zinc-700 dark:text-zinc-300">Auto-Save</p>
                               <p className="text-sm text-zinc-500 dark:text-zinc-400">Save changes automatically</p>
                           </div>
                           <button 
                               onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                               className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 focus:ring-primary-light dark:focus:ring-primary-dark ${autoSaveEnabled ? 'bg-primary-light dark:bg-primary-dark' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                           >
                               <span className="sr-only">Enable auto-save</span>
                               <span 
                                 className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'}`} 
                               />
                               {autoSaveEnabled && <span className="material-symbols-rounded text-white text-[10px] absolute left-1.5 font-bold">check</span>}
                           </button>
                       </div>
                   </section>
               </main>

               <footer className="mt-10 flex justify-end">
                   <button 
                       onClick={() => setIsSettingsOpen(false)}
                       className="px-6 py-2 text-base font-bold text-primary-light dark:text-primary-dark bg-primary-container-light/30 dark:bg-primary-container-dark/30 rounded-full hover:bg-primary-container-light/50 dark:hover:bg-primary-container-dark/50 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 transition-colors"
                   >
                       Done
                   </button>
               </footer>
           </div>
        </div>
      )}

      {/* Profile/About Dialog */}
      {isProfileDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="w-full max-w-sm bg-surface-3-light dark:bg-surface-3-dark rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative animate-[fadeIn_0.2s_ease-out]">
               <button 
                  onClick={() => setIsProfileDialogOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
               >
                  <span className="material-symbols-rounded text-xl">close</span>
               </button>

               <div className="w-24 h-24 rounded-full p-1 border-2 border-primary-light dark:border-primary-dark mb-4 mt-2">
                  <img 
                    src="https://i.pinimg.com/564x/24/38/64/243864d44e26eb18dd1f0664aac4f7b2.jpg" 
                    alt="Developer" 
                    className="w-full h-full rounded-full object-cover"
                  />
               </div>
               
               <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Piyush Makwana</h2>
               <p className="text-sm text-primary-light dark:text-primary-dark font-medium mb-5 uppercase tracking-wide">Cloud SAS Studio</p>
               
               <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8 px-4">
                  A web-based SAS Studio simulator powered by Gemini. Write SAS code, execute it virtually, and view logs and HTML results instantly.
               </p>

               <button 
                  onClick={() => setIsProfileDialogOpen(false)}
                  className="bg-primary-light dark:bg-primary-dark text-white dark:text-slate-900 font-bold text-sm px-8 py-2.5 rounded-full hover:shadow-lg hover:opacity-90 transition-all w-full"
               >
                   Close
               </button>
           </div>
        </div>
      )}

      {/* Snackbar */}
      {snackbar && (
        <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-[60] animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-6 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-rounded text-lg">
                    {snackbar.type === 'success' ? 'check_circle' : 'error_outline'}
                </span>
                {snackbar.message}
            </div>
        </div>
      )}
    </div>
  );
};

export default App;