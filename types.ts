export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string; // Only for files
}

export interface ExecutionResult {
  log: string;
  results: string; // HTML content
}

export enum TabType {
  CODE = 'CODE',
  LOG = 'LOG',
  RESULTS = 'RESULTS',
  OUTPUT_DATA = 'OUTPUT_DATA'
}

export interface SasState {
  code: string;
  log: string;
  results: string;
  isExecuting: boolean;
  activeBottomTab: TabType;
  selectedFileId: string | null;
}
