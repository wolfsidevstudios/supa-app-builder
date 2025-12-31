import { File } from '../types';

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

const EXTENSION_WHITELIST = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.vue', '.html', '.css', '.json', '.md'
]);

const IGNORED_PATHS = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'dist', 'build', 'node_modules', '.git'
]);

export const parseRepoUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch (e) {
    // Try parsing "owner/repo" string
    const parts = url.split('/');
    if (parts.length === 2) {
        return { owner: parts[0], repo: parts[1] };
    }
  }
  return null;
};

export const fetchGithubRepo = async (owner: string, repo: string, token: string): Promise<{ name: string, files: File[] }> => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  // 1. Get the Default Branch (usually main or master)
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) throw new Error('Repository not found or access denied');
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  // 2. Get the Tree (Recursive)
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
  if (!treeRes.ok) throw new Error('Failed to fetch repository tree');
  const treeData = await treeRes.json();

  // 3. Filter relevant files
  const blobs = (treeData.tree as GitHubTreeItem[]).filter(item => {
    if (item.type !== 'blob') return false;
    
    // Check ignored paths
    if (IGNORED_PATHS.has(item.path) || item.path.split('/').some(p => IGNORED_PATHS.has(p))) return false;
    
    // Check extension
    const ext = '.' + item.path.split('.').pop();
    if (!EXTENSION_WHITELIST.has(ext)) return false;

    // Size limit (skip files > 100KB to prevent browser crash)
    if (item.size && item.size > 100000) return false;

    return true;
  });

  // 4. Fetch Content (In batches to avoid rate limits/timeouts)
  const files: File[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < blobs.length; i += BATCH_SIZE) {
    const batch = blobs.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (blob) => {
      // We use the raw content URL if public, or API blob endpoint if private (requires token)
      // Using API blob endpoint is safer for token usage but requires base64 decoding.
      // However, fetching raw via API:
      const contentRes = await fetch(blob.url, { headers }); // Blob API URL
      const contentData = await contentRes.json();
      
      // Content is base64 encoded
      const content = decodeURIComponent(escape(atob(contentData.content.replace(/\s/g, ''))));
      
      return {
        name: blob.path,
        content: content,
        language: blob.path.split('.').pop() || 'txt'
      };
    });

    const batchResults = await Promise.all(promises);
    files.push(...batchResults);
  }

  return {
    name: repoData.name,
    files
  };
};