// src/contexts/CartContext.tsx
"use client";

import type { CartItem, Item } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Item, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCartItem: (itemId: string) => void;
  clearCart: () => void;
  totalCartItems: number;
  totalCartPrice: number;
  getItemQuantity: (itemId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('restaurantSupplyCart');
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('restaurantSupplyCart', JSON.stringify(cartItems));
    }
  }, [cartItems]);

  const addToCart = (item: Item, quantity: number) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((cartItem) => cartItem.code === item.code);
      if (existingItem) {
        // If item exists, update its quantity by adding the new amount.
        return prevItems.map((cartItem) =>
          cartItem.code === item.code
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      // If it's a new item, add it to the cart with the specified quantity.
      return [...prevItems, { ...item, quantity }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.code !== itemId));
  };
  
  const clearCartItem = (itemId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.code !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.code === itemId ? { ...item, quantity: Math.max(0, quantity) } : item
      ).filter(item => item.quantity > 0) // Remove if quantity is 0
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalCartItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  const totalCartPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const getItemQuantity = (itemId: string): number => {
    const item = cartItems.find(ci => ci.code === itemId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCartItem,
        clearCart,
        totalCartItems,
        totalCartPrice,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
