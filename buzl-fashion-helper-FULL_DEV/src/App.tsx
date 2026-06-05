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

const MAJOR_SYNC_ACTIONS: Record<string, string> = {
  generation_complete: 'Generation completed',
  qc_done: 'QC completed',
  brand_approved: 'Brand approved',
  site_uploaded: 'Live upload done',
};

const shortProductName = (name = 'Product') => (
  name.length > 42 ? `${name.slice(0, 39)}...` : name
);

const actorName = (product: any, log?: any) => (
  log?.user?.username || product.assignee?.username || 'A member'
);

const detectMajorSyncEvents = (previousProducts: any[], nextProducts: any[], currentUsername?: string | null) => {
  const previousById = new Map(previousProducts.map((product) => [product.id, product]));
  const events: { title: string; description: string }[] = [];

  for (const product of nextProducts) {
    const previous = previousById.get(product.id);
    if (!previous) continue;

    const productName = shortProductName(product.product_name);
    const nextAssignee = product.assignee?.username || '';
    const previousAssignee = previous.assignee?.username || '';

    if (!previous.assigned_to && product.assigned_to && nextAssignee !== currentUsername) {
      events.push({
        title: 'Task claimed',
        description: `${nextAssignee || 'A member'} claimed ${productName}.`,
      });
    }

    if (previous.assigned_to && !product.assigned_to && previousAssignee !== currentUsername) {
      events.push({
        title: 'Task unclaimed',
        description: `${previousAssignee || 'A member'} released ${productName}.`,
      });
    }

    const previousLogIds = new Set((previous.actionLogs || []).map((log: any) => log.id));
    const newMajorLogs = (product.actionLogs || [])
      .filter((log: any) => !previousLogIds.has(log.id) && MAJOR_SYNC_ACTIONS[log.action])
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const log of newMajorLogs) {
      const actor = actorName(product, log);
      if (actor === currentUsername) continue;
      events.push({
        title: MAJOR_SYNC_ACTIONS[log.action],
        description: `${actor} updated ${productName}.`,
      });
    }
  }

  return events.slice(0, 2);
};

const mergeProductSnapshots = (previousProducts: any[], nextProducts: any[]) => {
  const previousById = new Map(previousProducts.map((product) => [product.id, product]));
  return nextProducts.map((product) => {
    const previous = previousById.get(product.id);
    if (!previous) return product;
    return {
      ...previous,
      ...product,
      thumbnail_cached_data: product.thumbnail_cached_data ?? previous.thumbnail_cached_data ?? null,
      reference_thumbnail_cached_data: product.reference_thumbnail_cached_data ?? previous.reference_thumbnail_cached_data ?? null,
    };
  });
};

function App() {
  installToastSounds();

  const { authUser, setProducts, setWorkers } = useCsvStore();
  const productsSignatureRef = useRef('');
  const productsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!authUser) return;

    fetchWithAuth('/products')
      .then((products) => {
        productsSignatureRef.current = buildProductsSignature(products);
        productsRef.current = products;
        setProducts(products);
      })
      .catch(() => toast.error('Products could not load', {
        description: 'Check that the API server is reachable, then refresh the dashboard.',
      }));

    if (authUser.role === 'admin') {
      fetchWithAuth('/users')
        .then(setWorkers)
        .catch(() => toast.error('Members could not load', {
          description: 'Product data may still work, but member filters and assignment may be incomplete.',
        }));
    }
  }, [authUser, setProducts, setWorkers]);

  useEffect(() => {
    if (!authUser) return;

    const syncProducts = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const products = await fetchWithAuth('/products?lite=1');
        const mergedProducts = mergeProductSnapshots(productsRef.current, products);
        const nextSignature = buildProductsSignature(products);
        const previousSignature = productsSignatureRef.current;
        if (previousSignature && previousSignature !== nextSignature) {
          detectMajorSyncEvents(productsRef.current, products, authUser.username)
            .forEach((event) => toast.info(event.title, { description: event.description }));
          setProducts(mergedProducts);
        }
        productsRef.current = mergedProducts;
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
