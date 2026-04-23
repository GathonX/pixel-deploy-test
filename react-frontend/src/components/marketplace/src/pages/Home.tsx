import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import ProductCard from '../components/ProductCard';
import ProductWidget from '../components/ProductWidget';
import { products } from '../data/products';
import { ArrowRight } from 'lucide-react';

const categoryFilters = [
  { value: 'Laptops', label: 'Ordinateurs portables' },
  { value: 'Smartphones', label: 'Smartphones' },
  { value: 'Cameras', label: 'Caméras' },
  { value: 'Accessories', label: 'Accessoires' },
];

const Home = () => {
  const [activeTab, setActiveTab] = useState(categoryFilters[0].value);
  const [topSellingTab, setTopSellingTab] = useState(categoryFilters[0].value);

  const slider1Ref = useRef<Slider>(null);
  const slider2Ref = useRef<Slider>(null);
  const slider3Ref = useRef<Slider>(null);

  const filteredProducts = products.filter(p => p.category === activeTab);
  const topSellingProducts = products.filter(p => p.category === topSellingTab);

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    arrows: true,
    pauseOnHover: true,
    cssEase: 'linear',
    responsive: [
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        }
      }
    ]
  };

  useEffect(() => {
    const refs = [slider1Ref, slider2Ref, slider3Ref];
    const timers = refs.map((ref, index) =>
      setInterval(() => {
        ref.current?.slickNext();
      }, 6000 + index * 300)
    );

    return () => {
      timers.forEach(timer => clearInterval(timer));
    };
  }, []);

  const widgetSliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: false,
    pauseOnFocus: false,
    arrows: true,
    vertical: false,
    verticalSwiping: false,
    adaptiveHeight: true,
  };

  return (
    <div>
      {/* Shop Section */}
      <div className="py-12 bg-grey-light">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg group cursor-pointer">
              <img src="/img/shop01.png" alt="Ordinateurs portables" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition" />
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-3xl font-bold mb-2">
                  Collection<br />Ordinateurs portables
                </h3>
                <Link to="/laptops" className="inline-flex items-center gap-2 text-white hover:text-primary transition">
                  Découvrir <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg group cursor-pointer">
              <img src="/img/shop03.png" alt="Accessoires" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition" />
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-3xl font-bold mb-2">
                  Collection<br />Accessoires
                </h3>
                <Link to="/accessories" className="inline-flex items-center gap-2 text-white hover:text-primary transition">
                  Découvrir <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg group cursor-pointer">
              <img src="/img/shop02.png" alt="Caméras" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition" />
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-3xl font-bold mb-2">
                  Collection<br />Caméras
                </h3>
                <Link to="/cameras" className="inline-flex items-center gap-2 text-white hover:text-primary transition">
                  Découvrir <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Products Section */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-3xl font-bold text-[#2B2D42] uppercase">Nouveautés</h3>
            <div className="flex gap-4">
              {categoryFilters.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveTab(cat.value)}
                  className={`px-4 py-2 uppercase font-medium transition ${
                    activeTab === cat.value
                      ? 'text-[#2563eb] border-b-2 border-[#2563eb]'
                      : 'text-[#2B2D42] hover:text-[#2563eb]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <Slider {...sliderSettings}>
            {filteredProducts.map(product => (
              <div key={product.id} className="px-2">
                <ProductCard product={product} />
              </div>
            ))}
          </Slider>
        </div>
      </div>

      {/* Hot Deal Section */}
      <div className="relative py-24 bg-cover bg-center" style={{ backgroundImage: 'url(/img/hotdeal.png)' }}>
        <div className="absolute inset-0 from-[#0f172a]/95 via-[#1d4ed8]/80 to-[#2563eb]/80" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center text-white">
            <div className="flex justify-center gap-6 mb-8">
              <div className="text-center">
                <h3 className="text-5xl font-bold">02</h3>
                <p className="mt-2 text-sm uppercase">Jours</p>
              </div>
              <div className="text-center">
                <h3 className="text-5xl font-bold">10</h3>
                <p className="mt-2 text-sm uppercase">Heures</p>
              </div>
              <div className="text-center">
                <h3 className="text-5xl font-bold">34</h3>
                <p className="mt-2 text-sm uppercase">Minutes</p>
              </div>
              <div className="text-center">
                <h3 className="text-5xl font-bold">60</h3>
                <p className="mt-2 text-sm uppercase">Secondes</p>
              </div>
            </div>

            <h2 className="text-4xl font-bold mb-2 uppercase">Offre flash de la semaine</h2>
            <p className="text-xl mb-4">Nouvelle collection jusqu’à -50%</p>
            <button className="bg-white text-[#2563eb] px-8 py-3 rounded-full uppercase font-bold hover:bg-[#0f172a] hover:text-white transition">
              J’en profite
            </button>
          </div>
        </div>
      </div>

      {/* Top Selling Section */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-3xl font-bold text-[#2B2D42] uppercase">Meilleures ventes</h3>
            <div className="flex gap-4">
              {categoryFilters.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setTopSellingTab(cat.value)}
                  className={`px-4 py-2 uppercase font-medium transition ${
                    topSellingTab === cat.value
                      ? 'text-[#2563eb] border-b-2 border-[#2563eb]'
                      : 'text-[#2B2D42] hover:text-[#2563eb]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <Slider {...sliderSettings}>
            {topSellingProducts.map(product => (
              <div key={product.id} className="px-2">
                <ProductCard product={product} />
              </div>
            ))}
          </Slider>
        </div>
      </div>

      {/* Product Widgets Section */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Column 1 */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-[#2B2D42] uppercase">Top ventes</h4>
                <div className="products-slick-nav flex gap-[5px]">
                  <button
                    className="slick-prev slick-arrow"
                    onClick={() => slider1Ref.current?.slickPrev()}
                  />
                  <button
                    className="slick-next slick-arrow"
                    onClick={() => slider1Ref.current?.slickNext()}
                  />
                </div>
              </div>
              <div className="products-widget-slick">
                <Slider ref={slider1Ref} {...{ ...widgetSliderSettings, arrows: false }}>
                  <div>
                    {products.slice(6, 9).map(product => (
                      <ProductWidget key={product.id} product={product} />
                    ))}
                  </div>
                  <div>
                    {products.slice(0, 3).map(product => (
                      <ProductWidget key={product.id} product={product} />
                    ))}
                  </div>
                </Slider>
              </div>
            </div>

            {/* Column 2 */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-[#2B2D42] uppercase">Top ventes</h4>
                <div className="products-slick-nav flex gap-[5px]">
                  <button
                    className="slick-prev slick-arrow"
                    onClick={() => slider2Ref.current?.slickPrev()}
                  />
                  <button
                    className="slick-next slick-arrow"
                    onClick={() => slider2Ref.current?.slickNext()}
                  />
                </div>
              </div>
              <div className="products-widget-slick">
                <Slider ref={slider2Ref} {...{ ...widgetSliderSettings, arrows: false }}>
                  <div>
                    {products.slice(3, 6).map(product => (
                      <ProductWidget key={product.id} product={product} />
                    ))}
                  </div>
                  <div>
                    {products.slice(6, 9).map(product => (
                      <ProductWidget key={product.id} product={product} />
                    ))}
                  </div>
                </Slider>
              </div>
            </div>

            {/* Column 3 */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-[#2B2D42] uppercase">Top ventes</h4>
                <div className="products-slick-nav flex gap-[5px]">
                  <button
                    className="slick-prev slick-arrow"
                    onClick={() => slider3Ref.current?.slickPrev()}
                  />
                  <button
                    className="slick-next slick-arrow"
                    onClick={() => slider3Ref.current?.slickNext()}
                  />
                </div>
              </div>
              <div className="products-widget-slick">
                <Slider ref={slider3Ref} {...{ ...widgetSliderSettings, arrows: false }}>
                  <div>
                    {products.slice(0, 3).map(product => (
                      <ProductWidget key={product.id} product={product} />
                    ))}
                  </div>
                  <div>
                    {products.slice(3, 6).map(product => (
                      <ProductWidget key={product.id} product={product} />
                    ))}
                  </div>
                </Slider>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
