import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';

const links = [
  { href: '/', label: 'Home' },
  { href: '/hot-deals', label: 'Hot Deals' },
  { href: '/categories', label: 'Categories' },
  { href: '/laptops', label: 'Laptops' },
  { href: '/smartphones', label: 'Smartphones' },
  { href: '/cameras', label: 'Cameras' },
  { href: '/accessories', label: 'Accessories' },
];

const Navigation = () => {
  return (
    <nav id="navigation" className="bg-gradient-to-r from-[#0f172a] via-[#1d4ed8] to-[#2563eb]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4 text-white lg:hidden">
          <span className="text-sm font-semibold tracking-[0.3em] uppercase text-white/80">Menu</span>
          <Menu className="h-6 w-6" />
        </div>
        <div id="responsive-nav">
          <ul className="main-nav no-scrollbar flex flex-wrap items-center gap-4 overflow-x-auto py-4 text-sm font-semibold uppercase tracking-wide text-white lg:justify-start">
            {links.map(link => (
              <li key={link.label} className={link.href === '/' ? 'active' : undefined}>
                <Link
                  to={link.href}
                  className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-white/20 px-4 py-2 transition hover:border-white hover:bg-white/10"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
