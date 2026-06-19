import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculate cart summaries
  const cartCount = cart.reduce((total, item) => total + parseInt(item.quantity || 0), 0);
  const cartTotal = cart.reduce((total, item) => {
    const itemPrice = (item.selling_price && parseFloat(item.selling_price) > 0 && parseFloat(item.selling_price) < parseFloat(item.price)) ? parseFloat(item.selling_price) : parseFloat(item.price || 0);
    return total + (itemPrice * parseInt(item.quantity || 0));
  }, 0);

  // Sync / Load cart items on mount or when auth state changes
  useEffect(() => {
    const initializeCart = async () => {
      setLoading(true);
      if (token) {
        // Logged-in user: Sync guest cart if exists, then fetch from database
        const guestCart = localStorage.getItem('plant_guest_cart');
        if (guestCart) {
          try {
            const items = JSON.parse(guestCart);
            // Upload each guest cart item to database
            for (const item of items) {
              await axios.post(`${API_BASE_URL}/cart.php`, {
                product_id: item.product_id,
                quantity: item.quantity
              });
            }
            // Clear guest cart
            localStorage.removeItem('plant_guest_cart');
          } catch (e) {
            console.error('Failed to sync guest cart with server', e);
          }
        }
        await fetchCart();
      } else {
        const savedCart = localStorage.getItem('plant_guest_cart');
        if (savedCart) {
          try {
            setCart(JSON.parse(savedCart));
          } catch {
            localStorage.removeItem('plant_guest_cart');
            setCart([]);
          }
        } else {
          setCart([]);
        }
      }
      setLoading(false);
    };

    initializeCart();
  }, [token]);

  // Fetch cart from backend
  const fetchCart = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/cart.php`);
      if (response.data.success) {
        setCart(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    }
  };

  // Add item to cart
  const addToCart = async (product, quantity = 1) => {
    if (token) {
      // Authenticated Add
      try {
        const response = await axios.post(`${API_BASE_URL}/cart.php`, {
          product_id: product.id,
          quantity: quantity
        });
        if (response.data.success) {
          await fetchCart();
          return { success: true, message: response.data.message };
        }
        return { success: false, message: response.data.message };
      } catch (err) {
        return {
          success: false,
          message: err.response?.data?.message || 'Failed to add item to cart.'
        };
      }
    } else {
      // Guest Add (LocalStorage)
      const updatedCart = [...cart];
      const existingIndex = updatedCart.findIndex(item => item.product_id === product.id);

      if (existingIndex > -1) {
        const newQty = updatedCart[existingIndex].quantity + quantity;
        if (newQty > product.stock) {
          updatedCart[existingIndex].quantity = product.stock;
          return { success: false, message: `Only ${product.stock} items left in stock.` };
        }
        updatedCart[existingIndex].quantity = newQty;
      } else {
        if (quantity > product.stock) {
          return { success: false, message: `Only ${product.stock} items left in stock.` };
        }
        updatedCart.push({
          product_id: product.id,
          quantity: quantity,
          name: product.name,
          price: product.price,
          selling_price: product.selling_price || null,
          stock: product.stock,
          image_url: product.image_url,
          size: product.size,
          care_level: product.care_level
        });
      }

      setCart(updatedCart);
      localStorage.setItem('plant_guest_cart', JSON.stringify(updatedCart));
      return { success: true, message: 'Added to cart successfully.' };
    }
  };

  // Update item quantity in cart
  const updateQuantity = async (productId, quantity) => {
    if (token) {
      // Authenticated Update
      try {
        const response = await axios.put(`${API_BASE_URL}/cart.php`, {
          product_id: productId,
          quantity: quantity
        });
        if (response.data.success) {
          await fetchCart();
          return { success: true };
        }
      } catch (err) {
        console.error('Failed to update quantity', err);
        return {
          success: false,
          message: err.response?.data?.message || 'Failed to update quantity.'
        };
      }
    } else {
      // Guest Update (LocalStorage)
      let updatedCart = [...cart];
      const itemIndex = updatedCart.findIndex(item => item.product_id === productId);

      if (itemIndex > -1) {
        if (quantity <= 0) {
          updatedCart = updatedCart.filter(item => item.product_id !== productId);
        } else {
          const item = updatedCart[itemIndex];
          if (quantity > item.stock) {
            quantity = item.stock; // Cap at stock
          }
          updatedCart[itemIndex].quantity = quantity;
        }
        setCart(updatedCart);
        localStorage.setItem('plant_guest_cart', JSON.stringify(updatedCart));
        return { success: true };
      }
    }
    return { success: false };
  };

  // Remove single item from cart
  const removeFromCart = async (productId) => {
    if (token) {
      // Authenticated Delete
      try {
        const response = await axios.delete(`${API_BASE_URL}/cart.php`, {
          params: { product_id: productId }
        });
        if (response.data.success) {
          await fetchCart();
          return { success: true };
        }
      } catch (err) {
        console.error('Failed to remove item', err);
      }
    } else {
      // Guest Delete
      const updatedCart = cart.filter(item => item.product_id !== productId);
      setCart(updatedCart);
      localStorage.setItem('plant_guest_cart', JSON.stringify(updatedCart));
      return { success: true };
    }
    return { success: false };
  };

  // Clear entire cart
  const clearCart = async () => {
    if (token) {
      // Authenticated Clear
      try {
        await axios.delete(`${API_BASE_URL}/cart.php`);
        setCart([]);
      } catch (err) {
        console.error('Failed to clear cart', err);
      }
    } else {
      // Guest Clear
      setCart([]);
      localStorage.removeItem('plant_guest_cart');
    }
  };

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, loading, addToCart, updateQuantity, removeFromCart, clearCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
export default CartContext;
