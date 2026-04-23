import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Heart } from 'lucide-react';
import { FaCcVisa, FaCreditCard, FaCcPaypal, FaCcMastercard, FaCcDiscover, FaCcAmex } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer id="footer">
      {/* Top Footer */}
      <div className="section bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* About Us */}
            <div className="footer">
              <h3 className="footer-title text-[#2B2D42] uppercase font-bold mb-4">About Us</h3>
              <p className="text-[#8D99AE] mb-4">
                Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut.
              </p>
              <ul className="footer-links space-y-2">
                <li>
                  <a href="#" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors flex items-center gap-2">
                    <MapPin className="w-4 h-4" />1734 Stonecoal Road
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors flex items-center gap-2">
                    <Phone className="w-4 h-4" />+021-95-51-84
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors flex items-center gap-2">
                    <Mail className="w-4 h-4" />email@email.com
                  </a>
                </li>
              </ul>
            </div>

            {/* Categories */}
            <div className="footer">
              <h3 className="footer-title text-[#2B2D42] uppercase font-bold mb-4">Categories</h3>
              <ul className="footer-links space-y-2">
                <li>
                  <Link to="/hot-deals" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Hot deals
                  </Link>
                </li>
                <li>
                  <Link to="/laptops" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Laptops
                  </Link>
                </li>
                <li>
                  <Link to="/smartphones" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Smartphones
                  </Link>
                </li>
                <li>
                  <Link to="/cameras" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Cameras
                  </Link>
                </li>
                <li>
                  <Link to="/accessories" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Accessories
                  </Link>
                </li>
              </ul>
            </div>

            {/* Information */}
            <div className="footer">
              <h3 className="footer-title text-[#2B2D42] uppercase font-bold mb-4">Information</h3>
              <ul className="footer-links space-y-2">
                <li>
                  <Link to="/about" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/returns" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Orders and Returns
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Service */}
            <div className="footer">
              <h3 className="footer-title text-[#2B2D42] uppercase font-bold mb-4">Service</h3>
              <ul className="footer-links space-y-2">
                <li>
                  <Link to="/account" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    My Account
                  </Link>
                </li>
                <li>
                  <Link to="/cart" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    View Cart
                  </Link>
                </li>
                <li>
                  <Link to="/wishlist" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Wishlist
                  </Link>
                </li>
                <li>
                  <Link to="/track" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Track My Order
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="text-[#8D99AE] hover:text-[#2563eb] transition-colors">
                    Help
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div id="bottom-footer" className="section bg-[#1E1F29] py-6">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <ul className="footer-payments flex justify-center gap-4 mb-4">
              <li>
                <a href="#" className="text-white text-2xl hover:text-[#f59e0b] transition-colors">
                  <FaCcVisa />
                </a>
              </li>
              <li>
                <a href="#" className="text-white text-2xl hover:text-[#f59e0b] transition-colors">
                  <FaCreditCard />
                </a>
              </li>
              <li>
                <a href="#" className="text-white text-2xl hover:text-[#f59e0b] transition-colors">
                  <FaCcPaypal />
                </a>
              </li>
              <li>
                <a href="#" className="text-white text-2xl hover:text-[#f59e0b] transition-colors">
                  <FaCcMastercard />
                </a>
              </li>
              <li>
                <a href="#" className="text-white text-2xl hover:text-[#f59e0b] transition-colors">
                  <FaCcDiscover />
                </a>
              </li>
              <li>
                <a href="#" className="text-white text-2xl hover:text-[#f59e0b] transition-colors">
                  <FaCcAmex />
                </a>
              </li>
            </ul>
            <span className="copyright text-[#8D99AE] text-sm">
              Copyright &copy;{new Date().getFullYear()} All rights reserved | This template is made with{' '}
              <Heart className="w-3 h-3 inline-block text-[#f59e0b]" aria-hidden="true" /> by{' '}
              <a href="https://colorlib.com" target="_blank" className="text-[#f59e0b] hover:underline">
                Colorlib
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
