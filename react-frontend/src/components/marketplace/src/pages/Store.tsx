import { useState } from 'react';
import ProductCard from '../components/ProductCard';
import { products } from '../data/products';

const Store = () => {
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = ['Laptops', 'Smartphones', 'Cameras', 'Accessories'];

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredProducts = products.filter(product => {
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
    return matchesPrice && matchesCategory;
  });

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-8">
          <ul className="flex gap-2 text-sm">
            <li><a href="/" className="text-primary">Home</a></li>
            <li className="text-grey-medium">/</li>
            <li className="text-grey-medium">All Products</li>
          </ul>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-12 md:col-span-3">
            {/* Categories */}
            <div className="bg-white border border-grey rounded p-4 mb-6">
              <h4 className="font-bold text-header uppercase mb-4">Categories</h4>
              <ul className="space-y-2">
                {categories.map(category => (
                  <li key={category}>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="w-4 h-4"
                      />
                      <span>{category}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price Filter */}
            <div className="bg-white border border-grey rounded p-4 mb-6">
              <h4 className="font-bold text-header uppercase mb-4">Price</h4>
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span>${priceRange[0]}</span>
                <span>${priceRange[1]}</span>
              </div>
            </div>

            {/* Top Rated */}
            <div className="bg-white border border-grey rounded p-4">
              <h4 className="font-bold text-header uppercase mb-4">Top Rated</h4>
              <div className="space-y-4">
                {products.slice(0, 3).map(product => (
                  <div key={product.id} className="flex gap-3">
                    <img src={product.image} alt={product.name} className="w-16 h-16 object-contain" />
                    <div>
                      <p className="text-xs text-grey-medium">{product.category}</p>
                      <h5 className="text-sm font-medium text-header hover:text-primary transition">
                        {product.name}
                      </h5>
                      <p className="text-primary font-bold text-sm">${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="col-span-12 md:col-span-9">
            <div className="flex justify-between items-center mb-6">
              <p className="text-grey-medium">
                Showing {filteredProducts.length} Products
              </p>
              <select className="px-4 py-2 border border-grey rounded focus:outline-none focus:ring-2 focus:ring-primary">
                <option>Sort by: Default</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Name: A to Z</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-grey-medium text-lg">No products found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Store;
