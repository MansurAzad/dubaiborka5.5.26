import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import SEOHead from "@/components/seo/SEOHead";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import StructuredData from "@/components/seo/StructuredData";
import { motion } from "framer-motion";
import { Filter, Grid, List, Heart, ShoppingBag, Search, X, GitCompareArrows, Zap, Star } from "lucide-react";
import StockBadge from "@/components/shop/StockBadge";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import QuickViewModal from "@/components/shop/QuickViewModal";
import ProductCompare from "@/components/shop/ProductCompare";
import SizeGuide from "@/components/shop/SizeGuide";
import RecentlyViewed from "@/components/shop/RecentlyViewed";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { type Product, type RatingSummary, getProductImage } from "@/types/product";

interface CategoryItem {
  name: string;
  name_bn: string | null;
  slug: string | null;
}

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name", label: "Name" },
];

const PAGE_SIZE = 12;

const categoryBengaliNames: Record<string, string> = {
  Abaya: "আবায়া",
  Borka: "বোরকা",
  Hijab: "হিজাব",
  Kaftan: "কাফতান",
  Scarf: "স্কার্ফ",
  Fabric: "ফেব্রিক",
};

const RatingStars = ({ avg, count }: { avg: number; count: number }) => {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1 mt-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 md:w-3.5 md:h-3.5 ${
              star <= Math.round(avg)
                ? "fill-primary text-primary"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] md:text-xs text-muted-foreground">
        ({count})
      </span>
    </div>
  );
};

const Shop = () => {
  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get("category") || "All";
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [showFilters, setShowFilters] = useState(false);
  const [gridView, setGridView] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedMaterial, setSelectedMaterial] = useState("All");
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toast } = useToast();
  const { recentlyViewed } = useRecentlyViewed();

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [compareList, setCompareList] = useState<Product[]>([]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedCategory(urlCategory);
  }, [urlCategory]);

  // Build sort column/order for server-side sorting
  const getSortConfig = () => {
    switch (sortBy) {
      case "price-low": return { column: "price" as const, ascending: true };
      case "price-high": return { column: "price" as const, ascending: false };
      case "name": return { column: "name" as const, ascending: true };
      default: return { column: "created_at" as const, ascending: false };
    }
  };

  // Server-side paginated products
  const {
    data: productPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
  } = useInfiniteQuery({
    queryKey: ["shop-products", selectedCategory, searchQuery, priceRange, sortBy, selectedMaterial],
    queryFn: async ({ pageParam = 0 }) => {
      const { column, ascending } = getSortConfig();
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("products")
        .select("id, name, price, sale_price, image_url, category, sizes, colors, description, stock, slug, material", { count: "exact" });

      // Server-side filters
      if (selectedCategory !== "All") {
        query = query.ilike("category", selectedCategory);
      }
      if (searchQuery.trim()) {
        query = query.ilike("name", `%${searchQuery.trim()}%`);
      }
      if (selectedMaterial !== "All") {
        query = query.eq("material", selectedMaterial);
      }

      // Price range filter — use sale_price or price
      query = query.or(`price.gte.${priceRange[0]},sale_price.gte.${priceRange[0]}`);
      query = query.or(`price.lte.${priceRange[1]},sale_price.lte.${priceRange[1]}`);

      query = query.order(column, { ascending }).range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { products: (data as Product[]) || [], totalCount: count || 0, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      if (nextPage * PAGE_SIZE >= lastPage.totalCount) return undefined;
      return nextPage;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const allProducts = useMemo(() =>
    productPages?.pages.flatMap(p => p.products) || [],
    [productPages]
  );
  const totalCount = productPages?.pages[0]?.totalCount ?? 0;

  // Fetch categories
  const { data: dbCategories = [] } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name, name_bn, slug")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as CategoryItem[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch ratings
  const { data: ratings = {} } = useQuery<Record<string, RatingSummary>>({
    queryKey: ["shop-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("product_id, rating");
      if (error) throw error;
      const map: Record<string, { total: number; count: number }> = {};
      (data || []).forEach((r) => {
        if (!map[r.product_id]) map[r.product_id] = { total: 0, count: 0 };
        map[r.product_id].total += r.rating;
        map[r.product_id].count += 1;
      });
      const result: Record<string, RatingSummary> = {};
      for (const [id, v] of Object.entries(map)) {
        result[id] = { avg: v.total / v.count, count: v.count };
      }
      return result;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Derive unique materials from loaded products for filter options
  const { data: availableMaterials = [] } = useQuery({
    queryKey: ["shop-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("material")
        .not("material", "is", null);
      if (error) throw error;
      const mats = new Set<string>();
      (data || []).forEach(p => { if (p.material) mats.add(p.material); });
      return Array.from(mats).sort();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Max price for slider
  const { data: maxPrice = 50000 } = useQuery({
    queryKey: ["shop-max-price"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("price")
        .order("price", { ascending: false })
        .limit(1);
      return data?.[0]?.price || 50000;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { rootMargin: "200px" });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setPriceRange([0, maxPrice]);
    setSortBy("newest");
    setSelectedMaterial("All");
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "All" || priceRange[0] > 0 || priceRange[1] < maxPrice || selectedMaterial !== "All";

  const handleAddToCart = async (product: Product) => {
    const defaultSize = product.sizes?.[0] || undefined;
    const defaultColor = product.colors?.[0] || undefined;
    await addToCart(product.id, 1, defaultSize, defaultColor);
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  };

  const toggleCompare = (product: Product) => {
    setCompareList((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      if (prev.length >= 4) {
        toast({ title: "Maximum 4 products can be compared", variant: "destructive" });
        return prev;
      }
      return [...prev, product];
    });
  };

  const getCategoryBnName = (name: string) => {
    const found = dbCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
    return found?.name_bn || categoryBengaliNames[name] || name;
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: selectedCategory === "All"
      ? "সকল প্রোডাক্ট — দুবাই বোরকা হাউস"
      : `${getCategoryBnName(selectedCategory)} কালেকশন — দুবাই বোরকা হাউস`,
    description: selectedCategory === "All"
      ? "দুবাই বোরকা হাউসের সম্পূর্ণ কালেকশন — আবায়া, বোরকা, হিজাব, কাফতান ও প্রিমিয়াম ফেব্রিক।"
      : `${getCategoryBnName(selectedCategory)} — দুবাই থেকে আমদানিকৃত প্রিমিয়াম কালেকশন।`,
    url: `https://dubaiborkahouse.com/shop${selectedCategory !== "All" ? `?category=${selectedCategory}` : ""}`,
    numberOfItems: totalCount,
    provider: { "@type": "Organization", name: "Dubai Borka House" },
  };

  const catBn = getCategoryBnName(selectedCategory);
  const seoTitle = selectedCategory === "All"
    ? "বোরকা, আবায়া ও হিজাব কিনুন"
    : `${catBn} কিনুন — সেরা দাম`;
  const seoDescription = selectedCategory === "All"
    ? "দুবাই বোরকা হাউসের প্রিমিয়াম আবায়া, বোরকা, হিজাব, কাফতান ও ফেব্রিক কালেকশন। দুবাই থেকে সরাসরি আমদানি। সেরা দামে অনলাইনে কিনুন।"
    : `${catBn} অনলাইনে কিনুন — দুবাই বোরকা হাউস। দুবাই ইম্পোর্ট, প্রিমিয়াম কোয়ালিটি, সেরা দাম।`;
  const seoKeywords = selectedCategory === "All"
    ? "বোরকা দাম, আবায়া অনলাইন, হিজাব কিনুন, কাফতান দাম, ফেব্রিক বাংলাদেশ, dubai borka, abaya price bd, hijab online shop"
    : `${catBn} দাম, ${catBn} অনলাইন, ${selectedCategory} price bangladesh, buy ${selectedCategory.toLowerCase()} online bd`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={seoTitle} description={seoDescription} canonical="/shop" keywords={seoKeywords} />
      <StructuredData data={collectionSchema} />
      <Header />
      <Breadcrumbs />
      <main className="pt-4 pb-20">
        <div className="bg-card border-b border-border py-8 md:py-12 mb-6 md:mb-8">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4">
                <span className="text-foreground">Our </span>
                <span className="text-gradient-gold">Collection</span>
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
                Premium fashion collection imported directly from Dubai.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          {/* Search Bar + Size Guide */}
          <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-10 h-10" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <SizeGuide />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 mb-6 md:mb-8">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              <button onClick={() => setSelectedCategory("All")} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${selectedCategory === "All" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                সব
              </button>
              {dbCategories.map((cat) => (
                <button key={cat.name} onClick={() => setSelectedCategory(cat.name)} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {cat.name_bn || cat.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-1.5 md:px-4 md:py-2 bg-muted rounded-lg text-xs md:text-sm border-0 focus:ring-2 focus:ring-primary flex-shrink-0">
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm transition-colors flex-shrink-0 ${showFilters ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Filters
              </button>
              <div className="flex border border-border rounded-lg overflow-hidden flex-shrink-0 ml-auto">
                <button onClick={() => setGridView(true)} className={`p-1.5 md:p-2 ${gridView ? "bg-primary text-primary-foreground" : "bg-muted"}`}><Grid className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                <button onClick={() => setGridView(false)} className={`p-1.5 md:p-2 ${!gridView ? "bg-primary text-primary-foreground" : "bg-muted"}`}><List className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-8 p-6 bg-card rounded-xl border border-border">
              <div className="flex flex-wrap items-end gap-8">
                <div className="flex-1 min-w-[250px]">
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Price Range: ৳{priceRange[0].toLocaleString()} - ৳{priceRange[1].toLocaleString()}
                  </label>
                  <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={maxPrice} step={100} className="w-full" />
                </div>
                <div className="min-w-[180px]">
                  <label className="block text-sm font-medium text-foreground mb-3">ম্যাটেরিয়াল / ফ্যাব্রিক</label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full px-3 py-2 bg-muted rounded-lg text-sm border-0 focus:ring-2 focus:ring-primary"
                  >
                    <option value="All">সব ম্যাটেরিয়াল</option>
                    {availableMaterials.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">Showing <span className="text-foreground font-medium">{allProducts.length}</span> of <span className="text-foreground font-medium">{totalCount}</span> products</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-sm text-primary hover:underline">Clear All Filters</button>
            )}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid gap-3 md:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-muted rounded-xl mb-3" />
                  <div className="h-3 bg-muted rounded w-1/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : allProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg mb-4">No products found.</p>
              <button onClick={clearFilters} className="btn-gold">Clear Filters</button>
            </div>
          ) : (
            <>
              <div className={`grid ${gridView ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6" : "grid-cols-1 gap-4"}`}>
                {allProducts.map((product, index) => {
                  const isInCompare = compareList.some((p) => p.id === product.id);
                  const rating = ratings[product.id];
                  return (
                    <motion.div key={product.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }} className="group">
                      <div className={`card-luxury ${!gridView ? "flex gap-4 md:gap-6" : ""}`}>
                        <div className={`relative overflow-hidden rounded-xl ${gridView ? "aspect-[3/4] mb-3 md:mb-4" : "w-28 h-28 md:w-48 md:h-48 flex-shrink-0"}`}>
                          <img src={getProductImage(product)} alt={`${product.name} — ${getCategoryBnName(product.category)} দুবাই বোরকা হাউস`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                          {product.sale_price && (
                            <span className="absolute top-2 left-2 md:top-3 md:left-3 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-semibold bg-secondary text-secondary-foreground">Sale</span>
                          )}
                          <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3">
                            <StockBadge stock={product.stock} compact />
                          </div>
                          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 md:gap-2">
                            <button onClick={() => toggleWishlist(product.id)} className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors ${isInWishlist(product.id) ? "bg-primary text-primary-foreground" : "bg-foreground text-background hover:bg-primary hover:text-primary-foreground"}`}>
                              <Heart className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
                            </button>
                            <button onClick={() => handleAddToCart(product)} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                              <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => handleQuickView(product)} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => toggleCompare(product)} className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors ${isInCompare ? "bg-primary text-primary-foreground" : "bg-foreground text-background hover:bg-primary hover:text-primary-foreground"}`}>
                              <GitCompareArrows className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                          </div>
                        </div>
                        <div className={`${!gridView ? "flex-1" : ""}`}>
                          <span className="text-primary text-[10px] md:text-xs uppercase tracking-wider font-medium">{product.category}</span>
                          <Link to={`/product/${product.slug || product.id}`}>
                            <h3 className="font-medium text-foreground text-xs md:text-base mt-0.5 md:mt-1 hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
                          </Link>
                          {rating && <RatingStars avg={rating.avg} count={rating.count} />}
                          <div className="flex items-center gap-2 mt-1 md:mt-2">
                            <span className="font-semibold text-sm md:text-lg text-gradient-gold">৳{(product.sale_price || product.price).toLocaleString()}</span>
                            {product.sale_price && <span className="text-muted-foreground line-through text-[10px] md:text-sm">৳{product.price.toLocaleString()}</span>}
                          </div>
                          {!gridView && product.description && (
                            <p className="text-muted-foreground text-sm mt-2 line-clamp-2">{product.description}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Infinite scroll trigger */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="py-8 flex justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}

          <RecentlyViewed productIds={recentlyViewed} />
        </div>
      </main>
      <Footer />

      {quickViewProduct && (
        <QuickViewModal product={quickViewProduct} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
      )}
      {compareList.length > 0 && (
        <ProductCompare compareList={compareList} onRemove={(id) => setCompareList((prev) => prev.filter((p) => p.id !== id))} onClear={() => setCompareList([])} getProductImage={getProductImage} />
      )}
    </div>
  );
};

export default Shop;
