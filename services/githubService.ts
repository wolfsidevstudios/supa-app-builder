
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
  '.ts', '.tsx', '.js', '.jsx', '.vue', '.html', '.css', '.json', '.md', '.sql', '.toml'
]);

const IGNORED_PATHS = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'dist', 'build', 'node_modules', '.git'
]);

// --- Existing Import Logic ---

export const parseRepoUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch (e) {
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

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) throw new Error('Repository not found or access denied');
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
  if (!treeRes.ok) throw new Error('Failed to fetch repository tree');
  const treeData = await treeRes.json();

  const blobs = (treeData.tree as GitHubTreeItem[]).filter(item => {
    if (item.type !== 'blob') return false;
    if (IGNORED_PATHS.has(item.path) || item.path.split('/').some(p => IGNORED_PATHS.has(p))) return false;
    const ext = '.' + item.path.split('.').pop();
    if (!EXTENSION_WHITELIST.has(ext)) return false;
    if (item.size && item.size > 100000) return false;
    return true;
  });

  const files: File[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < blobs.length; i += BATCH_SIZE) {
    const batch = blobs.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (blob) => {
      const contentRes = await fetch(blob.url, { headers }); 
      const contentData = await contentRes.json();
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

// --- New Export/Push Logic ---

export const createGitHubRepo = async (token: string, name: string, description: string): Promise<{ owner: string, repo: string, html_url: string }> => {
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  // 1. Create Repo
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      description,
      private: false, // Vercel works best with public for free tier, or private if authenticated
      auto_init: true // Important: Creates the initial commit so we have a HEAD
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to create repository");
  }

  const data = await res.json();
  return { owner: data.owner.login, repo: data.name, html_url: data.html_url };
};

export const pushToGitHubRepo = async (token: string, owner: string, repo: string, files: File[], message: string) => {
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  // 1. Get Reference to HEAD (main)
  const refRes = await fetch(`${baseUrl}/git/ref/heads/main`, { headers });
  if (!refRes.ok) throw new Error("Could not fetch repository HEAD ref");
  const refData = await refRes.json();
  const latestCommitSha = refData.object.sha;

  // 2. Get the commit to get the tree SHA
  const commitRes = await fetch(`${baseUrl}/git/commits/${latestCommitSha}`, { headers });
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create Blobs for each file
  const treeItems = [];
  
  for (const file of files) {
    const blobRes = await fetch(`${baseUrl}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: file.content,
        encoding: 'utf-8'
      })
    });
    
    if (!blobRes.ok) continue; // Skip failed files
    const blobData = await blobRes.json();
    
    treeItems.push({
      path: file.name,
      mode: '100644', // file mode
      type: 'blob',
      sha: blobData.sha
    });
  }

  // 4. Create a new Tree
  const treeRes = await fetch(`${baseUrl}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems
    })
  });
  
  if (!treeRes.ok) throw new Error("Failed to create git tree");
  const treeData = await treeRes.json();

  // 5. Create a Commit
  const newCommitRes = await fetch(`${baseUrl}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: message,
      tree: treeData.sha,
      parents: [latestCommitSha]
    })
  });

  if (!newCommitRes.ok) throw new Error("Failed to create commit");
  const newCommitData = await newCommitRes.json();

  // 6. Update Reference (Force Push effectively)
  const updateRefRes = await fetch(`${baseUrl}/git/refs/heads/main`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: newCommitData.sha,
      force: false
    })
  });

  if (!updateRefRes.ok) throw new Error("Failed to update repository reference");
};
