/** 购物车状态管理 */
'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { cartApi } from './api';

export interface CartItem {
  id: number;
  course_id: number;
  title: string;
  cover: string;
  price: number;
  original_price: number;
  slug: string;
  difficulty: string;
  student_count: number;
  course_type: string;
}

export interface CartContextType {
  cartCount: number;
  items: CartItem[];
  refreshCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextType>({
  cartCount: 0,
  items: [],
  refreshCart: async () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const [items, setItems] = useState<CartItem[]>([]);

  const refreshCart = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('access_token');
    if (!token) {
      setCartCount(0);
      setItems([]);
      return;
    }
    try {
      const res = await cartApi.getCart();
      const data = res.data || { items: [] };
      setItems(data.items || []);
      setCartCount(data.items?.length || 0);
    } catch {
      // 未登录/接口异常时不显示角标
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    // 监听 token 变化（登录/退出）时刷新购物车
    refreshCart();
    const timer = setInterval(refreshCart, 15000); // 定时刷新
    return () => clearInterval(timer);
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, items, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
