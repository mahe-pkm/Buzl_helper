import { useState, useEffect, useCallback, useRef } from 'react';
import { ImportSection } from './components/ImportSection';
import { Dashboard } from './components/Dashboard';
import { ProductList } from './components/ProductList';
import { SettingsPanel } from './components/SettingsPanel';
import { useCsvStore } from './store/useCsvStore';
import { fetchWithAuth, getDashboardUrl } from './utils/api';
import { installToastSounds } from './utils/toastSound';
import { Settings, RefreshCw, LogIn } from 'lucide-react';
import { Toaster, toast } from 'sonner';

const buildProductsSignature = (items: any[]) => items
  .map((p) => [
    p.id,
    p.updatedAt,
    p.lastActivityAt,
    p.assigned_to || '',
    p.assignedAt || '',
    p.status || '',
    p.current_phase || '',
    p.regen_image_count ?? 0,
    p.generated_image_count ?? 0,
    p.full_regen_image_count ?? 0,
    p.actionLogs?.length ?? 0,
  ].join(':'))
  .sort()
  .join('|');

function App() {
  installToastSounds();

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
  const productsSignatureRef = useRef('');
  const autoSyncStartedRef = useRef(false);

  // We are "imported" in server mode if we are logged in (have username and token)
  const isSessionActive = connectionMode === 'server' ? (!!token && !!username) : isImported;

  const handleRefreshTasks = useCallback(async (options?: { silent?: boolean; notifyOnChange?: boolean }) => {
    if (connectionMode !== 'server' || !token) return;
    const silent = options?.silent ?? false;
    if (!silent) setRefreshing(true);
    try {
      const fetched = await fetchWithAuth('/products');
      const nextSignature = buildProductsSignature(fetched);
      const previousSignature = productsSignatureRef.current;
      const hasChanged = previousSignature !== '' && previousSignature !== nextSignature;
      // Map API Products to Extension internal format
      const mapped = fetched.map((p: any) => ({
        id: p.id,
        product_name: p.product_name,
        category: p.category ?? null,
        drive_folder: p.drive_folder,
        reference_link: p.reference_link || undefined,
        reference_thumbnail_url: p.reference_thumbnail_url || null,
        thumbnail_url: p.thumbnail_url || undefined,
        thumbnail_cached_data: p.thumbnail_cached_data || null,
        reference_thumbnail_cached_data: p.reference_thumbnail_cached_data || null,
        createdAt: p.createdAt || undefined,
        updatedAt: p.updatedAt || undefined,
        assignedAt: p.assignedAt || null,
        lastActivityAt: p.lastActivityAt || null,
        assigned_to: p.assigned_to || null,
        assignee: p.assignee || null,
        status: p.status || 'pending',
        current_phase: p.current_phase || 'none',
        regen_image_count: typeof p.regen_image_count === 'number' ? p.regen_image_count : 0,
        generated_image_count: typeof p.generated_image_count === 'number' ? p.generated_image_count : 0,
        full_regen_image_count: typeof p.full_regen_image_count === 'number' ? p.full_regen_image_count : 0,
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
      productsSignatureRef.current = nextSignature;
      if (!silent) {
        toast.success('Tasks synced from server', {
          description: `${mapped.length} product${mapped.length === 1 ? '' : 's'} loaded for ${username || 'this member'}.`,
        });
      } else if (options?.notifyOnChange && hasChanged) {
        toast.info('Tasks updated by another member', {
          description: 'Your list was refreshed automatically with the latest server changes.',
        });
      }
    } catch (err: any) {
      if (!silent) toast.error('Server sync failed', {
        description: err.message || 'Check the API URL in settings, then use refresh again.',
      });
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [connectionMode, token, setProducts]);

  // Sync tasks on server environment change or connectionMode change
  useEffect(() => {
    if (connectionMode === 'server' && token) {
      handleRefreshTasks();
    }
  }, [connectionMode, token, handleRefreshTasks]);

  useEffect(() => {
    if (connectionMode !== 'server' || !token) return;
    autoSyncStartedRef.current = true;
    const intervalId = window.setInterval(() => {
      if (!autoSyncStartedRef.current || document.visibilityState === 'hidden') return;
      handleRefreshTasks({ silent: true, notifyOnChange: true });
    }, 20000);

    return () => {
      autoSyncStartedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [connectionMode, token, handleRefreshTasks]);

  const handleOpenDashboard = () => {
    const rawUrl = getDashboardUrl();
    if (!rawUrl) {
      toast.error('Dashboard URL is missing. Update it in settings.');
      setSettingsOpen(true);
      return;
    }

    const targetUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    try {
      new URL(targetUrl);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Dashboard URL is invalid. Update it in settings.');
      setSettingsOpen(true);
    }
  };

  return (
    <div className="mx-auto h-[100dvh] w-full max-w-[420px] bg-gray-50 overflow-hidden flex flex-col shadow-xl relative">
      <Toaster
        position="top-center"
        closeButton
        toastOptions={{
          classNames: {
            closeButton: 'border border-gray-200 bg-white/85 text-gray-400 transition-colors hover:bg-white hover:text-gray-700',
          },
        }}
      />

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
          <button
            onClick={handleOpenDashboard}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            title="Open Dashboard Login"
          >
            <LogIn size={12} />
            <span>Dashboard</span>
          </button>
          {connectionMode === 'server' && token && (
            <button 
              onClick={() => handleRefreshTasks()} 
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
              <span className="text-[10px] text-gray-400 font-semibold">Member: {username}</span>
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
