import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12">
      {/* Sidebar */}
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 border-r p-4 space-y-3">
        <div className="text-xl font-bold">The Hublab</div>
        <nav className="grid gap-2">
          <Link className="border rounded px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800" href="/">
            Planes (Constructor)
          </Link>
          <Link className="border rounded px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800" href="/admin/services">
            Servicios
          </Link>
          <Link className="border rounded px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800" href="/admin/categories">
            Categorías
          </Link>
        </nav>
      </aside>

      {/* Contenido */}
      <main className="col-span-12 md:col-span-9 lg:col-span-10 p-4">
        {children}
      </main>
    </div>
  );
}
