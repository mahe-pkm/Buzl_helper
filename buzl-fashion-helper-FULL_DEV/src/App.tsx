import { useEffect, useRef } from 'react';
import { Login } from './components/Login';
import { AdminView } from './components/AdminView';
import { WorkerView } from './components/WorkerView';
import { useCsvStore } from './store/useCsvStore';
import { fetchWithAuth } from './utils/api';
import { installToastSounds } from './utils/toastSound';
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

  const { authUser, setProducts, setWorkers } = useCsvStore();
  const productsSignatureRef = useRef('');

  useEffect(() => {
    if (!authUser) return;

    fetchWithAuth('/products')
      .then((products) => {
        productsSignatureRef.current = buildProductsSignature(products);
        setProducts(products);
      })
      .catch(() => toast.error('Failed to fetch products'));

    if (authUser.role === 'admin') {
      fetchWithAuth('/users')
        .then(setWorkers)
        .catch(() => toast.error('Failed to fetch members'));
    }
  }, [authUser, setProducts, setWorkers]);

  useEffect(() => {
    if (!authUser) return;

    const syncProducts = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const products = await fetchWithAuth('/products');
        const nextSignature = buildProductsSignature(products);
        const previousSignature = productsSignatureRef.current;
        if (previousSignature && previousSignature !== nextSignature) {
          setProducts(products);
          toast.info('Tasks updated by another member');
        }
        productsSignatureRef.current = nextSignature;
      } catch {
        // Keep background sync quiet; manual refresh still reports failures.
      }
    };

    const intervalId = window.setInterval(syncProducts, 20000);
    return () => window.clearInterval(intervalId);
  }, [authUser, setProducts]);

  const toaster = (
    <Toaster
      position={authUser?.role === 'admin' ? 'top-right' : 'top-center'}
      closeButton
      toastOptions={{
        classNames: {
          closeButton: 'border border-gray-200 bg-white/85 text-gray-400 transition-colors hover:bg-white hover:text-gray-700',
        },
      }}
    />
  );

  if (!authUser) {
    return (
      <div className="w-full min-h-[100dvh] bg-gray-50">
        {toaster}
        <Login />
      </div>
    );
  }

  if (authUser.role === 'admin') {
    return (
      <>
        {toaster}
        <AdminView />
      </>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-gray-50">
      {toaster}
      <WorkerView />
    </div>
  );
}

export default App;
