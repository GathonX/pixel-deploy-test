import type { Product } from '../types';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { Heart, Repeat, Eye } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart, addToWishlist } = useCart();

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-b from-white via-white/95 to-slate-50 p-1 shadow-lg shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-premium">
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0f172a] via-[#1d4ed8] to-[#7c3aed] p-6">
        <div className="absolute inset-0 opacity-30 blur-3xl" aria-hidden="true" />
        <img
          src={product.image}
          alt={product.name}
          className="relative mx-auto h-48 w-full object-contain transition duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {(product.discount || product.oldPrice) && (
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {product.discount && (
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#b45309] shadow-sm">
                -{product.discount}%
              </span>
            )}
            {product.oldPrice && (
              <span className="rounded-full border border-white/60 bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-inner backdrop-blur">
                Nouveauté
              </span>
            )}
          </div>
        )}

        <div className="absolute top-4 right-4 flex flex-col gap-3">
          <button
            className="rounded-full bg-white/80 p-2 text-slate-600 transition hover:bg-white hover:text-[#2563eb]"
            onClick={() => addToWishlist(product)}
            aria-label="Ajouter à la wishlist"
          >
            <Heart className="h-4 w-4" />
          </button>
          <button
            className="rounded-full bg-white/80 p-2 text-slate-600 transition hover:bg-white hover:text-[#2563eb]"
            aria-label="Comparer le produit"
          >
            <Repeat className="h-4 w-4" />
          </button>
          <button
            className="rounded-full bg-white/80 p-2 text-slate-600 transition hover:bg-white hover:text-[#2563eb]"
            aria-label="Vue rapide du produit"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
          <span>{product.category}</span>
          <span className="flex items-center gap-1 text-[#f59e0b]">
            {product.rating?.toFixed(1) ?? '4.8'}
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </span>
        </div>

        <div>
          <Link
            to={`/product/${product.id}`}
            className="text-lg font-semibold text-[#0f172a] transition hover:text-[#2563eb]"
          >
            {product.name}
          </Link>
          <p className="mt-2 text-sm text-[#64748b]">
            Matériel certifié PixelRise™ avec livraison express, support technique et packaging premium inclus.
          </p>
        </div>

        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-bold text-[#2563eb]">${product.price.toFixed(2)}</span>
          {product.oldPrice && (
            <del className="text-sm text-[#94a3b8]">${product.oldPrice.toFixed(2)}</del>
          )}
          {product.discount && (
            <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-semibold text-[#b45309]">
              Économie garantie
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-[#64748b]">
          <span className="rounded-full bg-[#f8fafc] px-3 py-1">Stock vérifié</span>
          <span className="rounded-full bg-[#f8fafc] px-3 py-1">Livraison 48h</span>
          <span className="rounded-full bg-[#f8fafc] px-3 py-1">Garantie 2 ans</span>
        </div>

        <div className="mt-auto flex items-center gap-3 pt-4">
          <button
            className="flex-1 rounded-full bg-gradient-to-r from-[#f59e0b] via-[#f97316] to-[#2563eb] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-cta transition hover:shadow-lg"
            onClick={() => addToCart(product)}
          >
            Ajouter au panier
          </button>
          <Link
            to={`/product/${product.id}`}
            className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-[#2563eb] transition hover:border-[#2563eb]"
          >
            Fiche
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;

