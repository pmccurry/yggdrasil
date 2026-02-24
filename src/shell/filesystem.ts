import { invoke } from '@tauri-apps/api/core';

export interface FileNode {
  name: string;
  path: string;
  is_directory: boolean;
}

export async function readDirectory(path: string): Promise<FileNode[]> {
  return invoke<FileNode[]>('read_directory', { path });
}

export async function readFile(path: string): Promise<string> {
  return invoke<string>('read_file', { path });
}
