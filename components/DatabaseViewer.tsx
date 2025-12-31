import React, { useMemo, useState, useEffect } from 'react';
import { File } from '../types';
import { Database, AlertCircle, RefreshCw, Server, Table, Loader2 } from 'lucide-react';

interface DatabaseViewerProps {
  files: File[];
  projectId?: string; // Optional: Only available for GenBase
}

export const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ files, projectId }) => {
  // --- GenBase State ---
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Mock Data Logic (Legacy) ---
  const mockDataInfo = useMemo(() => {
    if (projectId) return null; // Skip if in GenBase mode

    const dataFile = files.find(f => 
      f.name === 'data/initialData.ts' || 
      f.name === 'data/initialData.js' || 
      ((f.name.includes('data/') || f.name.includes('mock')) && 
      (f.name.endsWith('.ts') || f.name.endsWith('.js') || f.name.endsWith('.json')))
    );

    if (!dataFile) return { error: "No mock data file found (e.g., data/initialData.ts)" };

    try {
      const content = dataFile.content;
      const arrayMatch = content.match(/\[([\s\S]*?)\]/);
      
      if (!arrayMatch) return { error: "Could not identify an array structure in the data file." };

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
  }, [files, projectId]);

  // --- GenBase Logic ---

  const executeQuery = async (sql: string) => {
    if (!projectId) return;
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sql })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Query failed');
      }
      return await res.json();
    } catch (e: any) {
      throw e;
    }
  };

  const fetchTables = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Query to find tables in the current user's schema (search_path is set by API)
      const res = await executeQuery(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = current_schema()
      `);
      const tableNames = res.map((r: any) => r.table_name);
      setTables(tableNames);
      
      if (tableNames.length > 0 && !selectedTable) {
        setSelectedTable(tableNames[0]);
      } else if (tableNames.length === 0) {
        setError("No tables found. Ask the assistant to create tables via SQL.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTableData = async (tableName: string) => {
    if (!projectId || !tableName) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await executeQuery(`SELECT * FROM "${tableName}" LIMIT 100`);
      setTableData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Load for GenBase
  useEffect(() => {
    if (projectId) {
      fetchTables();
    }
  }, [projectId]);

  // Fetch data when table selection changes
  useEffect(() => {
    if (projectId && selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [projectId, selectedTable]);

  // --- Render MOCK View ---
  if (!projectId) {
    if (mockDataInfo?.error) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500 bg-[#09090b] gap-4">
          <div className="p-4 bg-surface rounded-full">
             <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="max-w-md text-center">{mockDataInfo.error}</p>
          <p className="text-xs text-zinc-600">Ensure your app has a 'data/initialData.ts' file with an exported array.</p>
        </div>
      );
    }
    const { data, fileName } = mockDataInfo!;
    return <TableView data={data} title={`Mock Data (${fileName})`} type="mock" />;
  }

  // --- Render GENBASE View ---
  return (
    <div className="h-full w-full flex bg-[#09090b]">
      {/* Sidebar for Tables */}
      <div className="w-56 border-r border-border bg-surface/50 flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Database</h3>
          <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
             <Server className="h-4 w-4" />
             GenBase
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="px-2 py-2 text-xs text-zinc-500 font-medium">Tables</div>
          {tables.length === 0 && !isLoading ? (
            <div className="px-3 py-2 text-sm text-zinc-600 italic">No tables found</div>
          ) : (
            tables.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTable(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 flex items-center gap-2 transition-colors ${
                  selectedTable === t ? 'bg-blue-500/20 text-blue-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                <Table className="h-3 w-3" />
                {t}
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t border-border">
           <button 
             onClick={fetchTables}
             className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-surface border border-border text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
           >
             <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
             Refresh Schema
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-red-400 gap-2">
             <AlertCircle className="h-8 w-8" />
             <p>{error}</p>
          </div>
        ) : isLoading && tableData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 gap-2">
             <Loader2 className="h-6 w-6 animate-spin" />
             <p>Loading data...</p>
          </div>
        ) : (
          <TableView 
            data={tableData} 
            title={selectedTable || 'Select a table'} 
            type="genbase" 
            onRefresh={() => selectedTable && fetchTableData(selectedTable)}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

// --- Shared Table Component ---
const TableView: React.FC<{ 
  data: any[], 
  title: string, 
  type: 'mock' | 'genbase', 
  onRefresh?: () => void,
  isLoading?: boolean
}> = ({ data, title, type, onRefresh, isLoading }) => {
  
  const headers = data && data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-[#09090b]">
      {/* Header */}
      <div className="flex-none px-6 py-3 border-b border-border bg-surface/30 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'mock' ? <Database className="h-4 w-4 text-orange-400" /> : <Table className="h-4 w-4 text-blue-400" />}
          <span className="text-sm font-semibold text-zinc-200">{title}</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-xs text-zinc-500">
             {data.length} records
           </div>
           {onRefresh && (
             <button 
                onClick={onRefresh}
                className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Refresh Data"
             >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
             </button>
           )}
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto p-6">
        {data.length === 0 ? (
            <div className="text-zinc-500 text-sm italic">Table is empty.</div>
        ) : (
            <div className="border border-border rounded-lg overflow-hidden bg-surface/20 inline-block min-w-full align-middle">
            <table className="min-w-full text-left text-sm">
                <thead className="bg-surface/80 text-zinc-400 font-medium">
                <tr>
                    {headers.map((header) => (
                    <th key={header} className="px-4 py-3 border-b border-border capitalize whitespace-nowrap">
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
                        
                        if (typeof cellValue === 'object' && cellValue !== null) {
                            displayValue = JSON.stringify(cellValue);
                        } else if (typeof cellValue === 'boolean') {
                            displayValue = cellValue ? 'true' : 'false';
                        }

                        return (
                        <td key={`${i}-${header}`} className="px-4 py-3 text-zinc-300 whitespace-nowrap max-w-[300px] truncate">
                            {String(displayValue ?? '')}
                        </td>
                        );
                    })}
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
      </div>
    </div>
  );
};