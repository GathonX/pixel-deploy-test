import { useSearchParams, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function CgvPublicPage() {
  const { siteId: paramSiteId } = useParams<{ siteId?: string }>();
  const [searchParams] = useSearchParams();
  const siteId = paramSiteId || searchParams.get('site_id') || '';

  const [html, setHtml]           = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  useEffect(() => {
    if (!siteId) { setLoading(false); return; }
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    fetch(`${apiBase}/public/booking/${siteId}/cgv`)
      .then(r => r.json())
      .then(d => { setHtml(d.cgv || null); setUpdatedAt(d.updated_at || null); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [siteId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-800 text-sm">Conditions Générales de Vente</span>
          <button onClick={() => window.close()} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Fermer
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            Impossible de charger les conditions générales de vente.
          </div>
        )}

        {!loading && !error && !html && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            Aucune condition générale de vente disponible pour ce site.
          </div>
        )}

        {!loading && !error && html && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 prose prose-sm max-w-none">
            {updatedAt && (
              <p className="text-xs text-gray-400 mb-6 not-prose">
                Date de mise à jour : {updatedAt}
              </p>
            )}
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        )}
      </main>
    </div>
  );
}
