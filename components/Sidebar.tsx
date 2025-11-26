import React, { useState } from 'react';
import { FileNode } from '../types';

interface SidebarProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  selectedFileId: string | null;
}

const FileTreeItem: React.FC<{ 
  node: FileNode; 
  level: number; 
  onSelect: (file: FileNode) => void;
  selectedId: string | null;
}> = ({ node, level, onSelect, selectedId }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
        onSelect(node);
    }
  };

  const isSelected = node.id === selectedId;
  const isFolder = node.type === 'folder';

  return (
    <div className="mb-1">
      <div 
        className={`
            flex items-center justify-between px-4 py-2.5 rounded-full cursor-pointer select-none text-sm transition-colors mx-2
            ${isSelected 
                ? 'bg-primary-container-light dark:bg-primary-container-dark text-on-primary-container-light dark:text-on-primary-container-dark font-bold' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }
        `}
        style={{ paddingLeft: `${level === 0 ? 16 : level * 20 + 16}px` }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3 truncate">
            {isFolder ? (
                <span className="material-symbols-rounded text-slate-500 dark:text-slate-400 text-lg">
                    {isOpen ? 'folder_open' : 'folder'}
                </span>
            ) : (
                <span className={`material-symbols-rounded text-lg ${isSelected ? 'text-inherit' : 'text-slate-500 dark:text-slate-400'}`}>
                    description
                </span>
            )}
            <span className="truncate">{node.name}</span>
        </div>
        
        {isFolder && (
             <span className="material-symbols-rounded text-slate-500 dark:text-slate-400 text-lg">
                 {isOpen ? 'expand_more' : 'chevron_right'}
             </span>
        )}
      </div>
      {isFolder && isOpen && node.children && (
        <div className="mt-1">
          {node.children.map(child => (
            <FileTreeItem 
                key={child.id} 
                node={child} 
                level={level + 1} 
                onSelect={onSelect}
                selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ files, onFileSelect, selectedFileId }) => {
  return (
    <aside className="w-72 bg-surface-2-light dark:bg-surface-2-dark p-2 flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 transition-colors">
      <h2 className="text-sm font-bold text-slate-600 dark:text-slate-400 px-4 mb-2 mt-2">Explorer</h2>
      <nav className="flex flex-col gap-0.5 flex-grow overflow-y-auto">
        {files.map(file => (
          <FileTreeItem 
            key={file.id} 
            node={file} 
            level={0} 
            onSelect={onFileSelect}
            selectedId={selectedFileId}
          />
        ))}
      </nav>
    </aside>
  );
};