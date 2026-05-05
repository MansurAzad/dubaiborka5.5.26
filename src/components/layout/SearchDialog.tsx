import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProductImage } from "@/types/product";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface SearchProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  category: string;
  slug?: string | null;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SearchDialog = ({ open, onOpenChange }: SearchDialogProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, sale_price, image_url, category, slug")
        .or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(10);
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="relative">
        <CommandInput
          placeholder="Search products..."
          value={query}
          onValueChange={setQuery}
          className="text-base"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <CommandList className="max-h-[60vh] sm:max-h-[300px]">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && query && results.length === 0 && (
          <CommandEmpty>No products found</CommandEmpty>
        )}
        {!loading && results.length > 0 && (
          <CommandGroup heading="Products">
            {results.map((product) => (
              <CommandItem
                key={product.id}
                value={product.name}
                onSelect={() => {
                  navigate(`/product/${product.slug || product.id}`);
                  onOpenChange(false);
                }}
                className="cursor-pointer py-3"
              >
                <div className="flex items-center gap-3 w-full">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-12 h-12 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">
                    ৳{(product.sale_price || product.price).toLocaleString()}
                  </span>
                </div>
              </CommandItem>
            ))}
            {results.length >= 5 && query && (
              <CommandItem
                value={`view-all-${query}`}
                onSelect={() => {
                  navigate(`/shop?search=${encodeURIComponent(query)}`);
                  onOpenChange(false);
                }}
                className="cursor-pointer py-3 justify-center text-primary font-medium"
              >
                View all results for "{query}" →
              </CommandItem>
            )}
          </CommandGroup>
        )}
        {!loading && !query && (
          <CommandGroup heading="Popular Categories">
            {["Borka", "Abaya", "Hijab", "Kaftan", "Scarf", "Fabric"].map((cat) => (
              <CommandItem
                key={cat}
                value={cat}
                onSelect={() => {
                  navigate(`/shop?category=${cat}`);
                  onOpenChange(false);
                }}
                className="cursor-pointer py-3"
              >
                <Search className="w-4 h-4 mr-2" />
                {cat}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default SearchDialog;
