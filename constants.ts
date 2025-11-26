import { FileNode } from "./types";

export const INITIAL_FILES: FileNode[] = [
    {
        id: 'root',
        name: 'Files',
        type: 'folder',
        children: [
            {
                id: 'myfolders',
                name: 'My Folders',
                type: 'folder',
                children: [] // Start empty
            },
            {
                id: 'sashelp',
                name: 'SASHELP (Read Only)',
                type: 'folder',
                children: []
            }
        ]
    }
];