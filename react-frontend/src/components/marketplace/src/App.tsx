import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import { CartProvider } from './context/CartContext';
import MarketplaceWrapper from '../MarketplaceWrapper';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';

// 🎠 SLICK CAROUSEL - CSS requis pour les carousels
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// 🛒 MARKETPLACE CSS
import './index.css';
import './App.css';

function App() {
  return (
    <MarketplaceWrapper>
      <CartProvider>
        <LandingNavbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hot-deals" element={<Home />} />
          <Route path="/laptops" element={<Home />} />
          <Route path="/smartphones" element={<Home />} />
          <Route path="/cameras" element={<Home />} />
          <Route path="/accessories" element={<Home />} />
        </Routes>
        <LandingFooter />
      </CartProvider>
    </MarketplaceWrapper>
  );
}

export default App;
