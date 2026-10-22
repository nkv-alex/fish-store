"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isValidCart, type CartLine } from "@/lib/cart";

type CartContextValue = {
  cart: CartLine[];
  count: number;
  storageError: "restore" | "session" | "save" | null;
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const cartStorageKey = "fish-store-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<
    CartContextValue["storageError"]
  >(null);

  useEffect(() => {
    try {
      let savedCart = window.localStorage.getItem(cartStorageKey);
      if (savedCart === null) {
        savedCart = window.sessionStorage.getItem(cartStorageKey);
        if (savedCart !== null) {
          window.sessionStorage.removeItem(cartStorageKey);
        }
      }

      if (savedCart !== null) {
        const parsedCart: unknown = JSON.parse(savedCart);
        if (
          Array.isArray(parsedCart) &&
          (parsedCart.length === 0 || isValidCart(parsedCart))
        ) {
          setCart(parsedCart);
        } else {
          setStorageError("restore");
        }
      }
    } catch {
      setStorageError("session");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {
      setStorageError("save");
    }
  }, [cart, hydrated]);

  const clearCart = useCallback(() => {
    setStorageError(null);
    setCart([]);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: cart.reduce((sum, line) => sum + line.quantity, 0),
      storageError,
      addToCart(productId) {
        setStorageError(null);
        setCart((current) => {
          const existing = current.find((line) => line.productId === productId);
          if (existing) {
            return current.map((line) =>
              line.productId === productId
                ? { ...line, quantity: Math.min(line.quantity + 1, 10) }
                : line,
            );
          }
          return [...current, { productId, quantity: 1 }];
        });
      },
      removeFromCart(productId) {
        setStorageError(null);
        setCart((current) =>
          current.filter((line) => line.productId !== productId),
        );
      },
      setQuantity(productId, quantity) {
        setStorageError(null);
        setCart((current) =>
          current.map((line) =>
            line.productId === productId
              ? { ...line, quantity: Math.max(1, Math.min(quantity, 10)) }
              : line,
          ),
        );
      },
      clearCart,
    }),
    [cart, clearCart, storageError],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used within a CartProvider.");
  }
  return value;
}
