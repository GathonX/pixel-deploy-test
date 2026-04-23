import { Mail } from 'lucide-react';
import { FaFacebook, FaTwitter, FaInstagram, FaPinterest } from 'react-icons/fa';

const Newsletter = () => {
  return (
    <div id="newsletter" className="section bg-gradient-to-r from-[#f8fafc] via-[#eff6ff] to-[#e0e7ff] py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center">
          <div className="newsletter text-center">
            <p className="text-[#2B2D42] text-lg mb-4">
              Sign Up for the <strong>NEWSLETTER</strong>
            </p>
            <form className="flex justify-center mb-6">
              <input
                className="marketplace-input w-96 h-10 px-4 border border-[#E4E7ED] bg-white outline-none rounded-l-full"
                type="email"
                placeholder="Enter Your Email"
              />
              <button className="marketplace-newsletter-btn bg-gradient-to-r from-[#f59e0b] via-[#f97316] to-[#2563eb] text-white px-6 rounded-r-full hover:opacity-90 transition-opacity uppercase font-bold inline-flex items-center gap-2">
                <Mail className="w-4 h-4" /> Subscribe
              </button>
            </form>
            <ul className="newsletter-follow flex justify-center gap-2">
              <li>
                <a
                  href="#"
                  className="w-10 h-10 flex items-center justify-center border-2 border-[#B9BABC] rounded-full text-[#2B2D42] hover:bg-[#2563eb] hover:border-[#2563eb] hover:text-white transition-colors"
                >
                  <FaFacebook className="w-4 h-4" />
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="w-10 h-10 flex items-center justify-center border-2 border-[#B9BABC] rounded-full text-[#2B2D42] hover:bg-[#2563eb] hover:border-[#2563eb] hover:text-white transition-colors"
                >
                  <FaTwitter className="w-4 h-4" />
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="w-10 h-10 flex items-center justify-center border-2 border-[#B9BABC] rounded-full text-[#2B2D42] hover:bg-[#2563eb] hover:border-[#2563eb] hover:text-white transition-colors"
                >
                  <FaInstagram className="w-4 h-4" />
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="w-10 h-10 flex items-center justify-center border-2 border-[#B9BABC] rounded-full text-[#2B2D42] hover:bg-[#2563eb] hover:border-[#2563eb] hover:text-white transition-colors"
                >
                  <FaPinterest className="w-4 h-4" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Newsletter;
