import type { Product } from '../types';
import { Link } from 'react-router-dom';

interface ProductWidgetProps {
  product: Product;
}

const ProductWidget = ({ product }: ProductWidgetProps) => {
  return (
    <div className="product-widget relative mb-[30px] shadow-[0px_0px_0px_1px_#E4E7ED] transition-all duration-200 hover:shadow-[0px_10px_25px_rgba(37,99,235,0.1)]">
      <div className="product-img absolute left-0 top-0 w-[60px] h-[60px]">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="product-body pl-[75px] pr-[15px] py-[15px]">
        <p className="product-category uppercase text-xs text-[#8D99AE] mb-[5px]">Category</p>
        <h3 className="product-name text-sm mb-[5px]">
          <Link to={`/product/${product.id}`} className="font-medium text-[#2B2D42] hover:text-[#2563eb] transition-colors duration-200">
            {product.name}
          </Link>
        </h3>
        <h4 className="product-price text-[#2563eb] font-bold text-base">
          ${product.price.toFixed(2)}{' '}
          {product.oldPrice && (
            <del className="product-old-price text-xs font-normal text-[#8D99AE]">
              ${product.oldPrice.toFixed(2)}
            </del>
          )}
        </h4>
      </div>
    </div>
  );
};

export default ProductWidget;
