import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const Checkout = () => {
  const { cart, getCartTotal } = useCart();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    zipCode: '',
    paymentMethod: 'credit-card',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Order placed successfully!');
    navigate('/');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const shipping = 10.00;
  const subtotal = getCartTotal();
  const total = subtotal + shipping;

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-8">
          <ul className="flex gap-2 text-sm">
            <li><a href="/" className="text-primary">Home</a></li>
            <li className="text-grey-medium">/</li>
            <li className="text-grey-medium">Checkout</li>
          </ul>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-header mb-4">Your cart is empty</h2>
            <a href="/store" className="inline-block px-8 py-3 bg-primary text-white rounded hover:opacity-90 transition">
              Continue Shopping
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Billing Details */}
              <div className="md:col-span-2">
                <h3 className="text-2xl font-bold text-header uppercase mb-6">Billing Details</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-header font-medium mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-grey rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-header font-medium mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-grey rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-header font-medium mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-grey rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-header font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-grey rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-header font-medium mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-grey rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-header font-medium mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-grey rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-header font-medium mb-2">Country</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-grey rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Country</option>
                      <option value="US">United States</option>
                      <option value="UK">United Kingdom</option>
                      <option value="CA">Canada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-header font-medium mb-2">ZIP Code</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-grey rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mt-8">
                  <h3 className="text-2xl font-bold text-header uppercase mb-6">Payment Method</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="credit-card"
                        checked={formData.paymentMethod === 'credit-card'}
                        onChange={handleChange}
                        className="w-4 h-4"
                      />
                      <span className="text-header">Credit Card</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="paypal"
                        checked={formData.paymentMethod === 'paypal'}
                        onChange={handleChange}
                        className="w-4 h-4"
                      />
                      <span className="text-header">PayPal</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={formData.paymentMethod === 'cash'}
                        onChange={handleChange}
                        className="w-4 h-4"
                      />
                      <span className="text-header">Cash on Delivery</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <h3 className="text-2xl font-bold text-header uppercase mb-6">Order Summary</h3>
                <div className="bg-grey-light rounded p-6">
                  <div className="space-y-4 mb-6">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-header">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-primary font-bold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-grey pt-4 space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-header">Subtotal</span>
                      <span className="text-primary font-bold">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-header">Shipping</span>
                      <span className="text-primary font-bold">${shipping.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-grey pt-4">
                    <div className="flex justify-between text-lg">
                      <span className="text-header font-bold">Total</span>
                      <span className="text-primary font-bold text-2xl">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-6 bg-primary text-white py-3 rounded hover:opacity-90 transition font-bold uppercase"
                  >
                    Place Order
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Checkout;
