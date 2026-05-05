import { useState } from "react";
import { X, GitCompareArrows } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  category: string;
  sizes: string[];
  colors: string[];
}

interface ProductCompareProps {
  compareList: Product[];
  onRemove: (id: string) => void;
  onClear: () => void;
  getProductImage: (product: Product) => string;
}

const ProductCompare = ({ compareList, onRemove, onClear, getProductImage }: ProductCompareProps) => {
  const [open, setOpen] = useState(false);

  if (compareList.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-card border border-border rounded-xl px-5 py-3 shadow-lg flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {compareList.length} products to compare
            </span>
          </div>
          <div className="flex -space-x-2">
            {compareList.map((p) => (
              <img key={p.id} src={getProductImage(p)} alt={p.name} className="w-8 h-8 rounded-full border-2 border-card object-cover" />
            ))}
          </div>
          <Button onClick={() => setOpen(true)} className="btn-gold h-8 px-4 text-xs" disabled={compareList.length < 2}>
            Compare
          </Button>
          <button onClick={onClear} className="text-muted-foreground hover:text-destructive">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[80vh] bg-card border-border overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display text-xl text-foreground">Product Comparison</SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">
              Compare product features side by side
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr>
                  <th className="text-left p-3 text-sm text-muted-foreground font-medium w-32">Feature</th>
                  {compareList.map((p) => (
                    <th key={p.id} className="p-3 text-center min-w-[200px]">
                      <div className="relative">
                        <button onClick={() => onRemove(p.id)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs">
                          <X className="w-3 h-3" />
                        </button>
                        <img src={getProductImage(p)} alt={p.name} className="w-24 h-24 mx-auto rounded-lg object-cover mb-2" />
                        <Link to={`/product/${p.id}`} onClick={() => setOpen(false)} className="text-sm font-semibold text-foreground hover:text-primary">
                          {p.name}
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="p-3 text-sm text-muted-foreground">Price</td>
                  {compareList.map((p) => (
                    <td key={p.id} className="p-3 text-center">
                      <span className="font-bold text-gradient-gold">৳{(p.sale_price || p.price).toLocaleString()}</span>
                      {p.sale_price && (
                        <span className="block text-xs text-muted-foreground line-through">৳{p.price.toLocaleString()}</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 text-sm text-muted-foreground">Category</td>
                  {compareList.map((p) => (
                    <td key={p.id} className="p-3 text-center text-sm text-foreground">{p.category}</td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 text-sm text-muted-foreground">Sizes</td>
                  {compareList.map((p) => (
                    <td key={p.id} className="p-3 text-center text-sm text-foreground">{p.sizes?.join(", ") || "—"}</td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 text-sm text-muted-foreground">Colors</td>
                  {compareList.map((p) => (
                    <td key={p.id} className="p-3 text-center text-sm text-foreground">{p.colors?.join(", ") || "—"}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ProductCompare;
