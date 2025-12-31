import React, { useMemo } from 'react';
import { File } from '../types';
import { Database, AlertCircle, FileJson } from 'lucide-react';

interface DatabaseViewerProps {
  files: File[];
}

export const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ files }) => {
  const dataInfo = useMemo(() => {
    // Attempt to find the data file
    const dataFile = files.find(f => 
      f.name === 'data/initialData.ts' || 
      f.name === 'data/initialData.js' || 
      ((f.name.includes('data/') || f.name.includes('mock')) && 
      (f.name.endsWith('.ts') || f.name.endsWith('.js') || f.name.endsWith('.json')))
    );

    if (!dataFile) return { error: "No data file found (e.g., data/initialData.ts)" };

    try {
      // Very basic extraction of the array content
      // We look for [ ... ] structure
      const content = dataFile.content;
      const arrayMatch = content.match(/\[([\s\S]*?)\]/);
      
      if (!arrayMatch) {
        return { error: "Could not identify an array structure in the data file." };
      }

      // Dangerous but necessary for parsing loose JS objects (not strict JSON) from code
      // We wrap it in brackets to ensure it evaluates to an array
      // Note: In a production env, use a safer parser like 'acorn' or strict JSON requirements
      const rawArrayString = `[${arrayMatch[1]}]`;
      
      // eslint-disable-next-line no-new-func
      const parsedData = new Function(`return ${rawArrayString}`)();

      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        return { error: "Data file contains an empty array or invalid format." };
      }

      return { data: parsedData, fileName: dataFile.name };
    } catch (e: any) {
      return { error: `Failed to parse data: ${e.message}` };
    }
  }, [files]);

  if (dataInfo.error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500 bg-[#09090b] gap-4">
        <div className="p-4 bg-surface rounded-full">
           <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <p className="max-w-md text-center">{dataInfo.error}</p>
        <p className="text-xs text-zinc-600">Ensure your app has a 'data/initialData.ts' or 'data/initialData.js' file with an exported array.</p>
      </div>
    );
  }

  const { data, fileName } = dataInfo;
  const headers = data && data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-[#09090b]">
      {/* Header */}
      <div className="flex-none px-6 py-3 border-b border-border bg-surface/30 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-zinc-200">GenBase</span>
          <span className="text-xs text-zinc-500 ml-2">({fileName})</span>
        </div>
        <div className="text-xs text-zinc-500">
          {data.length} records
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="border border-border rounded-lg overflow-hidden bg-surface/20">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/80 text-zinc-400 font-medium">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-4 py-3 border-b border-border capitalize">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  {headers.map((header) => {
                    const cellValue = row[header];
                    let displayValue = cellValue;
                    
                    if (typeof cellValue === 'object') {
                        displayValue = JSON.stringify(cellValue);
                    } else if (typeof cellValue === 'boolean') {
                        displayValue = cellValue ? 'true' : 'false';
                    }

                    return (
                      <td key={`${i}-${header}`} className="px-4 py-3 text-zinc-300">
                        {String(displayValue)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};