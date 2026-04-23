import React from "react";
import { Facebook, Instagram, Youtube } from "lucide-react";

const LandingFooter: React.FC = () => {
  return (
    <>
      {/* Newsletter Section */}
      <div className="relative bg-gradient-to-br from-white to-indigo-50 py-16 md:py-24 px-4 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <img loading="lazy" src="/landing-assets/images/path14.svg" alt="" className="absolute top-10 left-10 w-20 h-20" />
          <img loading="lazy" src="/landing-assets/images/path72.svg" alt="" className="absolute top-20 right-10 w-16 h-16" />
          <img loading="lazy" src="/landing-assets/images/path73.svg" alt="" className="absolute bottom-10 left-20 w-24 h-24" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                Lancez votre projet digital
              </h2>
              <img
                src="/landing-assets/images/path930.svg"
                alt=""
                className="mx-auto h-2 w-40 md:w-56"
              />
            </div>

            <p className="text-gray-700 text-sm md:text-base max-w-2xl mx-auto opacity-80">
              Testez notre logiciel dès maintenant, sans engagement, aucune carte de crédit requise.
            </p>

            <div className="pt-4">
              <a
                href="/register"
                className="inline-flex items-center gap-3 px-6 py-3 bg-[#d6fa3d] text-black font-semibold rounded-lg hover:bg-[#9cef17] transition-all"
              >
                <span className="text-sm">Essayer gratuitement</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white text-gray-900 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Footer Top */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
            {/* Logo */}
            <div className="flex justify-center md:justify-start">
              <a href="/">
                <img
                  src="/landing-assets/images/Pixel-Rise_Logo.png"
                  alt="PixelRise Logo"
                  className="h-12 md:h-14 w-auto"
                />
              </a>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
              <a
                href="https://pixel-rise.com/fonctionalite.html"
                className="text-sm text-gray-600 hover:text-[#0066cc] transition-colors"
              >
                Fonctionalité
              </a>
              <a
                href="https://pixel-rise.com/tarification.html"
                className="text-sm text-gray-600 hover:text-[#0066cc] transition-colors"
              >
                Tarification
              </a>
              <a
                href="https://pixel-rise.com/contact.html"
                className="text-sm text-gray-600 hover:text-[#0066cc] transition-colors"
              >
                Aide
              </a>
              <a
                href={`${import.meta.env.VITE_API_URL}/blog`}
                className="text-sm text-gray-600 hover:text-[#0066cc] transition-colors"
              >
                Blog
              </a>
            </div>

            {/* Social Links */}
            <div className="flex items-center justify-center md:justify-end gap-4">
              <a
                href="https://web.facebook.com/profile.php?id=61572687665720"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white rounded-full transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/pixel_rise25/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-100 text-gray-700 hover:bg-pink-600 hover:text-white rounded-full transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.youtube.com/@PixelRise_Officiel"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-100 text-gray-700 hover:bg-red-600 hover:text-white rounded-full transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
              <a
                href="https://www.tiktok.com/@pixelrise_officiel"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-100 text-gray-700 hover:bg-black hover:text-white rounded-full transition-colors"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.75 2C12.75 2.69 12.77 3.38 12.83 4.06C13.03 6.37 14.75 8.21 17.03 8.56V11.18C15.9 11.05 14.83 10.66 13.88 10.04V16.09C13.88 18.83 11.66 21.05 8.92 21.05C6.18 21.05 3.96 18.83 3.96 16.09C3.96 13.35 6.18 11.13 8.92 11.13C9.21 11.13 9.49 11.15 9.77 11.2V13.84C9.52 13.79 9.26 13.76 8.99 13.76C7.85 13.76 6.92 14.7 6.92 15.84C6.92 16.98 7.85 17.91 8.99 17.91C10.13 17.91 11.07 16.98 11.07 15.84V2H12.75Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mb-8"></div>

          {/* Footer Bottom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Company Description */}
            <div className="text-center md:text-left space-y-3">
              <p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                <strong className="text-gray-900">PixelRise révolutionne</strong> l'automatisation marketing grâce à l'IA.
                Nous aidons <em>les entrepreneurs</em> à développer leur business en ligne
                <strong className="text-gray-900"> automatiquement et intelligemment</strong>.
              </p>
              <p className="text-gray-500 text-xs">
                © 2025 Tout droit reservé PixelRise
              </p>
            </div>

            {/* Legal Links */}
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-end gap-3 md:gap-4 text-xs">
              <a
                href="https://pixel-rise.com/politique-de-confidentialite.html"
                className="text-gray-600 hover:text-[#0066cc] transition-colors"
              >
                Politique de confidentialité
              </a>
              <a
                href="https://pixel-rise.com/mention-legales.html"
                className="text-gray-600 hover:text-[#0066cc] transition-colors"
              >
                Mention Légales
              </a>
              <a
                href="https://pixel-rise.com/cgv.html"
                className="text-gray-600 hover:text-[#0066cc] transition-colors"
              >
                CGV
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingFooter;
