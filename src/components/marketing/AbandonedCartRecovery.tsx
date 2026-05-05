import { useEffect, useContext } from "react";
import { CartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

/**
 * This component monitors cart state and stores a timestamp
 * when items are added but checkout isn't completed.
 * An edge function can later check for abandoned carts and send reminder emails.
 */
const AbandonedCartRecovery = () => {
  const cart = useContext(CartContext);
  const { user } = useAuth();

  const items = cart?.items ?? [];
  const itemCount = cart?.itemCount ?? 0;

  useEffect(() => {
    if (!user || itemCount === 0) {
      localStorage.removeItem("cartLastUpdated");
      return;
    }

    localStorage.setItem("cartLastUpdated", new Date().toISOString());
    localStorage.setItem("cartItemCount", String(itemCount));
  }, [items, itemCount, user]);

  return null;
};

export default AbandonedCartRecovery;
