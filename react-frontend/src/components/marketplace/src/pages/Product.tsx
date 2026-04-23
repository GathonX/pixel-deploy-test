import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Heart, ShoppingCart, Minus, Plus } from 'lucide-react';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';

const Product = () => {
  const { id } = useParams<{ id: string }>();
  const product = products.find(p => p.id === Number(id));
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const { addToCart, addToWishlist } = useCart();

  if (!product) {
    return <div className="container mx-auto px-4 py-12">Product not found</div>;
  }

  const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  const renderStars = (rating: number = 5) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        size={16}
        className={index < rating ? 'fill-yellow-400 text-yellow-400' : 'text-grey'}
      />
    ));
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="bg-grey-light py-4">
        <div className="container mx-auto px-4">
          <ul className="flex gap-2 text-sm">
            <li><a href="/" className="text-primary">Home</a></li>
            <li className="text-grey-medium">/</li>
            <li><a href="/store" className="text-primary">All Products</a></li>
            <li className="text-grey-medium">/</li>
            <li className="text-grey-medium">{product.name}</li>
          </ul>
        </div>
      </div>

      {/* Product Details */}
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            {/* Product Image */}
            <div>
              <img src={product.image} alt={product.name} className="w-full" />
            </div>

            {/* Product Info */}
            <div>
              <h2 className="text-3xl font-bold text-header mb-4">{product.name}</h2>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex gap-1">
                  {renderStars(product.rating)}
                </div>
                <a href="#reviews" className="text-primary hover:underline">3 Review(s) / Add your review</a>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-4xl font-bold text-primary">${product.price.toFixed(2)}</h3>
                {product.oldPrice && (
                  <del className="text-2xl text-grey-medium">${product.oldPrice.toFixed(2)}</del>
                )}
              </div>

              <p className="text-grey-medium mb-6">
                Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>

              <div className="mb-6">
                <p className="text-header mb-2">Available: <span className="text-primary font-bold">In Stock</span></p>
                <p className="text-header">Category: <span className="text-grey-medium">{product.category}</span></p>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center border border-grey rounded">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 hover:bg-grey-light transition"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border-x border-grey focus:outline-none py-2"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 hover:bg-grey-light transition"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    for (let i = 0; i < quantity; i++) {
                      addToCart(product);
                    }
                  }}
                  className="flex-1 bg-primary text-white py-3 px-6 rounded hover:opacity-90 transition font-bold uppercase flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </button>

                <button
                  onClick={() => addToWishlist(product)}
                  className="border border-grey p-3 rounded hover:border-primary hover:text-primary transition"
                >
                  <Heart size={20} />
                </button>
              </div>

              {/* Share */}
              <div className="flex items-center gap-4">
                <span className="text-header font-medium">Share:</span>
                <div className="flex gap-2">
                  <a href="#" className="w-10 h-10 flex items-center justify-center border border-grey rounded-full hover:border-primary hover:text-primary transition">f</a>
                  <a href="#" className="w-10 h-10 flex items-center justify-center border border-grey rounded-full hover:border-primary hover:text-primary transition">t</a>
                  <a href="#" className="w-10 h-10 flex items-center justify-center border border-grey rounded-full hover:border-primary hover:text-primary transition">+</a>
                </div>
              </div>
            </div>
          </div>

          {/* Product Tabs */}
          <div className="mb-16">
            <div className="flex gap-8 border-b border-grey mb-8">
              <button
                onClick={() => setActiveTab('description')}
                className={`py-3 font-bold uppercase ${
                  activeTab === 'description'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-header hover:text-primary'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`py-3 font-bold uppercase ${
                  activeTab === 'details'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-header hover:text-primary'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-3 font-bold uppercase ${
                  activeTab === 'reviews'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-header hover:text-primary'
                }`}
              >
                Reviews (3)
              </button>
            </div>

            <div>
              {activeTab === 'description' && (
                <p className="text-grey-medium">
                  Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                </p>
              )}
              {activeTab === 'details' && (
                <ul className="text-grey-medium space-y-2">
                  <li><strong>Brand:</strong> Sample Brand</li>
                  <li><strong>Model:</strong> Sample Model</li>
                  <li><strong>Color:</strong> Black</li>
                  <li><strong>Dimensions:</strong> 10 x 15 x 5 cm</li>
                </ul>
              )}
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <div className="border-b border-grey pb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-1">
                        {renderStars(5)}
                      </div>
                      <span className="font-bold">John Doe</span>
                    </div>
                    <p className="text-grey-medium">Great product! Highly recommended.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold text-header uppercase mb-8">Related Products</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {relatedProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Product;
