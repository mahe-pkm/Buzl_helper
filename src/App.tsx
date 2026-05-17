import { ImportSection } from './components/ImportSection';
import { Dashboard } from './components/Dashboard';
import { ProductList } from './components/ProductList';
import { useCsvStore } from './store/useCsvStore';

function App() {
  const { isImported, products } = useCsvStore();

  return (
    <div className="w-[400px] h-screen bg-gray-50 overflow-hidden flex flex-col shadow-xl">
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
        {isImported && (
          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm">
            {products.length} Items
          </span>
        )}
      </header>
      
      {!isImported ? (
        <div className="flex-1 overflow-y-auto">
          <ImportSection />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          <ImportSection />
          <Dashboard />
          <ProductList />
        </div>
      )}
    </div>
  );
}

export default App;
