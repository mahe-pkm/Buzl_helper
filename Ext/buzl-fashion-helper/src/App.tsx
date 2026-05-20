import { useState, useEffect, useCallback } from 'react';
import { ImportSection } from './components/ImportSection';
import { Dashboard } from './components/Dashboard';
import { ProductList } from './components/ProductList';
import { SettingsPanel } from './components/SettingsPanel';
import { useCsvStore } from './store/useCsvStore';
import { fetchWithAuth } from './utils/api';
import { Settings, RefreshCw } from 'lucide-react';
import { Toaster, toast } from 'sonner';

function App() {
  const { 
    isImported, 
    products, 
    setProducts, 
    connectionMode, 
    token, 
    username 
  } = useCsvStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // We are "imported" in server mode if we are logged in (have username and token)
  const isSessionActive = connectionMode === 'server' ? (!!token && !!username) : isImported;

  const handleRefreshTasks = useCallback(async () => {
    if (connectionMode !== 'server' || !token) return;
    setRefreshing(true);
    try {
      const fetched = await fetchWithAuth('/products');
      // Map API Products to Extension internal format
      const mapped = fetched.map((p: any) => ({
        id: p.id,
        product_name: p.product_name,
        drive_folder: p.drive_folder,
        reference_link: p.reference_link || undefined,
        thumbnail_url: p.thumbnail_url || undefined,
        assigned_to: p.assigned_to || null,
        assignee: p.assignee || null,
        status: p.status || 'pending',
        actionLogs: p.actionLogs || [],
        last_action: p.last_action || null,
        completed: p.status === 'completed',
        notes: p.notes || '',
        nameCopied: false,
        driveCopied: false,
        referenceCopied: false,
        driveOpened: false,
        referenceOpened: false
      }));

      setProducts(mapped);
      toast.success('Tasks updated from server');
    } catch (err: any) {
      toast.error('Failed to sync tasks with server');
    } finally {
      setRefreshing(false);
    }
  }, [connectionMode, token, setProducts]);

  // Sync tasks on server environment change or connectionMode change
  useEffect(() => {
    if (connectionMode === 'server' && token) {
      handleRefreshTasks();
    }
  }, [connectionMode, token, handleRefreshTasks]);

  return (
    <div className="mx-auto h-[100dvh] w-full max-w-[420px] bg-gray-50 overflow-hidden flex flex-col shadow-xl relative">
      <Toaster position="top-center" />

      <header className="flex-shrink-0 bg-white border-b border-gray-200 p-4 z-20 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-gray-900 to-black text-white p-1.5 rounded-lg shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h1 className="font-bold text-gray-900 tracking-tight text-lg">Buzl Helper</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {connectionMode === 'server' && token && (
            <button 
              onClick={handleRefreshTasks} 
              disabled={refreshing}
              className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all ${refreshing ? 'animate-spin' : ''}`}
              title="Sync Tasks"
            >
              <RefreshCw size={16} />
            </button>
          )}
          <button 
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          {isSessionActive && (
            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm">
              {products.length} Tasks
            </span>
          )}
        </div>
      </header>
      
      {!isSessionActive ? (
        <div className="flex-1 overflow-y-auto">
          {connectionMode === 'server' ? (
            <div className="p-8 flex flex-col items-center justify-center text-center h-full text-gray-400">
              <div className="text-5xl mb-4">🔒</div>
              <p className="font-bold text-gray-800 text-base mb-1">Server Mode Active</p>
              <p className="text-xs text-gray-500 max-w-xs mb-4">Please log in inside ecosystem settings to retrieve your live assigned task list.</p>
              <button 
                onClick={() => setSettingsOpen(true)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                Open Settings & Login
              </button>
            </div>
          ) : (
            <ImportSection />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          {connectionMode !== 'server' && <ImportSection />}
          {connectionMode === 'server' && (
            <div className="px-4 pt-3 flex items-center justify-between bg-white border-b border-gray-100 flex-shrink-0">
              <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Server Connected
              </span>
              <span className="text-[10px] text-gray-400 font-semibold">Worker: {username}</span>
            </div>
          )}
          <Dashboard />
          <ProductList />
        </div>
      )}

      {settingsOpen && (
        <SettingsPanel 
          onClose={() => setSettingsOpen(false)} 
          onRefreshTasks={handleRefreshTasks} 
        />
      )}
    </div>
  );
}

export default App;
