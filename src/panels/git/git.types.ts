export interface GitFileEntry {
  path: string;
  indexStatus: string;   // first char of porcelain code
  workTreeStatus: string; // second char of porcelain code
}

export interface GitBranchInfo {
  name: string;
  isCurrent: boolean;
  lastCommit: string;
}
