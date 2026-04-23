import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Phone, Mail, MapPin, DollarSign, User, Heart, ShoppingCart, Menu, X, ArrowRight } from 'lucide-react';

const Header = () => {
  const { cart, wishlist, getCartTotal, getCartCount, removeFromCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <header>
      {/* MAIN HEADER */}
      <div id="header" className="bg-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            {/* LOGO */}
            <div className="flex w-full items-center justify-center lg:w-1/4 lg:justify-start">
              <div className="header-logo max-w-[160px]">
                <Link to="/" className="logo block">
                  <img src="/img/logo.png" alt="Logo PixelRise" className="h-auto w-full object-contain" />
                </Link>
              </div>
            </div>
            {/* /LOGO */}

            {/* SEARCH BAR */}
            <div className="w-full lg:w-1/2">
              <div className="header-search">
                <form className="flex flex-col gap-3 sm:flex-row">
                  <select className="marketplace-input-select w-full rounded-full border border-[#E4E7ED] bg-white px-4 py-2.5 text-sm font-medium text-[#2B2D42] outline-none sm:w-auto">
                    <option value="0">All Categories</option>
                    <option value="1">Category 01</option>
                    <option value="1">Category 02</option>
                  </select>
                  <input
                    className="marketplace-input w-full rounded-full border border-[#E4E7ED] px-4 py-2.5 text-sm text-[#2B2D42] outline-none sm:flex-1"
                    placeholder="Search here"
                    type="text"
                  />
                  <button className="marketplace-search-btn w-full rounded-full bg-[#2563eb] px-6 py-2.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-[#1d4ed8] sm:w-auto">
                    Search
                  </button>
                </form>
              </div>
            </div>
            {/* /SEARCH BAR */}

            {/* ACCOUNT */}
            <div className="flex w-full justify-center lg:w-1/4 lg:justify-end">
              <div className="header-ctn flex w-full max-w-md items-center justify-center gap-4 sm:justify-end">
                {/* Wishlist */}
                <div>
                  <Link to="/wishlist" className="relative inline-block text-center">
                    <Heart className="w-6 h-6 mx-auto text-[#2B2D42] hover:text-[#2563eb] transition-colors" />
                    <div className="block mt-1">
                      <span className="text-xs text-[#2B2D42] uppercase font-medium">Your Wishlist</span>
                      {wishlist.length > 0 && (
                        <div className="qty absolute -top-2 -right-2 bg-[#f59e0b] text-[#0f172a] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                          {wishlist.length}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
                {/* /Wishlist */}

                {/* Cart */}
                <div className="dropdown relative">
                  <button
                    className="dropdown-toggle relative inline-block text-center"
                    onClick={() => setIsCartOpen(!isCartOpen)}
                  >
                    <ShoppingCart className="w-6 h-6 mx-auto text-[#2B2D42] hover:text-[#2563eb] transition-colors" />
                    <div className="block mt-1">
                      <span className="text-xs text-[#2B2D42] uppercase font-medium">Your Cart</span>
                      {getCartCount() > 0 && (
                        <div className="qty absolute -top-2 -right-2 bg-[#f59e0b] text-[#0f172a] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                          {getCartCount()}
                        </div>
                      )}
                    </div>
                  </button>

                  {isCartOpen && (
                    <div className="cart-dropdown absolute right-0 top-full mt-4 w-80 bg-white shadow-2xl border border-[#E4E7ED] z-50">
                      <div className="cart-list p-4">
                        {cart.length === 0 ? (
                          <p className="text-center text-[#8D99AE] py-4">Your cart is empty</p>
                        ) : (
                          cart.map((item) => (
                            <div key={item.id} className="product-widget flex items-center mb-4 pb-4 border-b border-[#E4E7ED] last:border-b-0">
                              <div className="product-img w-16 h-16 flex-shrink-0">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="product-body flex-1 px-3">
                                <h3 className="product-name text-sm font-medium text-[#2B2D42] hover:text-[#2563eb] mb-1">
                                  <a href="#">{item.name}</a>
                                </h3>
                                <h4 className="product-price text-[#2563eb] font-bold">
                                  <span className="qty text-[#8D99AE] font-normal">{item.quantity}x</span> ${item.price.toFixed(2)}
                                </h4>
                              </div>
                              <button
                                className="delete text-[#8D99AE] hover:text-[#2563eb] transition-colors"
                                onClick={() => removeFromCart(item.id)}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      {cart.length > 0 && (
                        <>
                          <div className="cart-summary px-4 py-3 border-t border-[#E4E7ED]">
                            <small className="text-[#8D99AE] text-xs uppercase">{getCartCount()} Item(s) selected</small>
                            <h5 className="text-[#2B2D42] font-bold uppercase mt-1">SUBTOTAL: ${getCartTotal().toFixed(2)}</h5>
                          </div>
                          <div className="cart-btns flex p-4 border-t border-[#E4E7ED]">
                            <Link
                              to="/cart"
                              className="flex-1 text-center py-2.5 bg-[#E4E7ED] text-[#2B2D42] uppercase font-bold mr-2 hover:bg-[#2563eb] hover:text-white transition-colors"
                            >
                              View Cart
                            </Link>
                            <Link
                              to="/checkout"
                              className="flex-1 text-center py-2.5 bg-gradient-to-r from-[#f59e0b] via-[#f97316] to-[#2563eb] text-white uppercase font-bold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-1"
                            >
                              Checkout <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* /Cart */}

                {/* Menu Toggle */}
                <div className="menu-toggle lg:hidden">
                  <a href="#" className="relative inline-block text-center">
                    <Menu className="w-6 h-6 mx-auto text-[#2B2D42]" />
                    <div className="block mt-1">
                      <span className="text-xs text-[#2B2D42] uppercase font-medium">Menu</span>
                    </div>
                  </a>
                </div>
                {/* /Menu Toggle */}
              </div>
            </div>
            {/* /ACCOUNT */}
          </div>
        </div>
      </div>
      {/* /MAIN HEADER */}
    </header>
  );
};

export default Header;
