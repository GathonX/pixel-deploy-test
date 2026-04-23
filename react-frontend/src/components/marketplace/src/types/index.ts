export interface Product {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  category: string;
  rating?: number;
  discount?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface WishlistItem extends Product {}
