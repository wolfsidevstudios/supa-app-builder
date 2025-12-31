
import React, { useState, useEffect } from 'react';
import { X, Cloud, Loader2, ExternalLink, AlertCircle, Rocket } from 'lucide-react';
import { Button } from './Button';
import { Project } from '../types';
import JSZip from 'jszip';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (project: Project) => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose, project, onUpdateProject }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage for Netlify token
    const storedToken = localStorage.getItem('netlify_access_token');
    if (storedToken) setToken(storedToken);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = () => {
    window.location.href = '/api/auth/netlify/authorize';
  };

  const handleDeploy = async () => {
    if (!token) return;
    setIsDeploying(true);
    setError(null);

    try {
      // 1. Create Zip
      const zip = new JSZip();
      project.files.forEach(file => {
        // Handle edge functions special path if needed, but standard file struct should work
        zip.file(file.name, file.content);
      });
      const content = await zip.generateAsync({ type: 'blob' });

      // 2. Determine Endpoint (Create new site or update existing)
      let apiUrl = 'https://api.netlify.com/api/v1/sites';
      let method = 'POST';

      if (project.netlifySiteId) {
        apiUrl = `https://api.netlify.com/api/v1/sites/${project.netlifySiteId}/deploys`;
      }

      // 3. Upload
      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/zip',
          // If creating a new site, we might need to send name in body? 
          // Netlify raw file upload for new site usually expects binary body.
        },
        body: content
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Netlify API Error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      
      // Update project with site ID if this was a new site creation
      // Note: If we POST to /sites, response has site_id and deploy_id
      // If we POST to /deploys, response has deploy_id
      
      let finalUrl = data.url || data.deploy_ssl_url || data.ssl_url;
      let siteId = data.site_id || (project.netlifySiteId ? project.netlifySiteId : data.id); // data.id is site_id for create

      if (!project.netlifySiteId && siteId) {
        onUpdateProject({ ...project, netlifySiteId: siteId });
      }

      setDeployUrl(finalUrl);

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Deployment failed.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Deploy to Netlify</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {!token ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-[#00C7B7]/10 rounded-full flex items-center justify-center">
                 <Rocket className="h-6 w-6 text-[#00C7B7]" />
              </div>
              <p className="text-zinc-400 text-sm">
                Connect your Netlify account to deploy your app and Edge Functions directly to the cloud.
              </p>
              <Button onClick={handleConnect} className="w-full bg-[#00C7B7] hover:bg-[#00b5a6] text-white border-none">
                Connect Netlify
              </Button>
            </div>
          ) : (
             <div className="space-y-4">
               {deployUrl ? (
                 <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-emerald-400 font-medium">
                       <Cloud className="h-5 w-5" /> Deployed Successfully!
                    </div>
                    <a 
                      href={deployUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200 underline"
                    >
                       {deployUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                 </div>
               ) : (
                 <>
                   <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                      <div className="h-10 w-10 bg-[#00C7B7]/20 rounded-lg flex items-center justify-center text-[#00C7B7] font-bold">
                        N
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Netlify Account</div>
                        <div className="text-xs text-zinc-500">Connected</div>
                      </div>
                   </div>
                   
                   <p className="text-xs text-zinc-400">
                     This will deploy your static files and any Edge Functions (<code>netlify/edge-functions/*</code>) to a live URL.
                   </p>

                   {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-none" />
                      <span>{error}</span>
                    </div>
                  )}

                   <div className="flex justify-end gap-3 mt-4">
                     <Button variant="secondary" onClick={onClose} disabled={isDeploying}>
                       Close
                     </Button>
                     <Button onClick={handleDeploy} isLoading={isDeploying} className="bg-[#00C7B7] hover:bg-[#00b5a6] text-white border-none">
                       {isDeploying ? 'Deploying...' : (project.netlifySiteId ? 'Update Deployment' : 'Deploy Site')}
                     </Button>
                   </div>
                 </>
               )}
             </div>
          )}

        </div>
      </div>
    </div>
  );
};
