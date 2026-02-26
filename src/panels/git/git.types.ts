export interface GitFileEntry {
  path: string;
  indexStatus: string;   // first char of porcelain code
  workTreeStatus: string; // second char of porcelain code
}
