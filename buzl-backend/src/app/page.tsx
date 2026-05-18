export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <main className="w-full max-w-xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
          Buzl Helper API
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal">
          Backend is online
        </h1>
        <p className="mt-4 text-base leading-7 text-neutral-300">
          This deployment serves the Buzl Helper API. Use the dashboard or
          extension to sign in and sync products.
        </p>
        <div className="mt-8 border-l-2 border-emerald-300 pl-4 font-mono text-sm text-neutral-300">
          <div>GET /api/products</div>
          <div>POST /api/auth/login</div>
        </div>
      </main>
    </div>
  );
}
