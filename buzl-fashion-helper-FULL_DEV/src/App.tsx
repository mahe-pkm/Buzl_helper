import { useEffect } from 'react';
import { Login } from './components/Login';
import { AdminView } from './components/AdminView';
import { WorkerView } from './components/WorkerView';
import { useCsvStore } from './store/useCsvStore';
import { fetchWithAuth } from './utils/api';
import { Toaster, toast } from 'sonner';

function App() {
  const { authUser, setProducts, setWorkers } = useCsvStore();

  useEffect(() => {
    if (!authUser) return;

    fetchWithAuth('/products')
      .then(setProducts)
      .catch(() => toast.error('Failed to fetch products'));

    if (authUser.role === 'admin') {
      fetchWithAuth('/users')
        .then(setWorkers)
        .catch(() => toast.error('Failed to fetch workers'));
    }
  }, [authUser]);

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
