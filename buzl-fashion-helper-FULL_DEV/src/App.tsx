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

  if (!authUser) {
    return (
      <div className="w-full min-h-[100dvh] bg-gray-50">
        <Toaster position="top-center" richColors />
        <Login />
      </div>
    );
  }

  if (authUser.role === 'admin') {
    return (
      <>
        <Toaster position="top-right" richColors />
        <AdminView />
      </>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-gray-50">
      <Toaster position="top-center" richColors />
      <WorkerView />
    </div>
  );
}

export default App;
