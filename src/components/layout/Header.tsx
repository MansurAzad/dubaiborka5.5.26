import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
  import { Menu, X, ShoppingBag, Search, User, Heart, LogOut, LayoutDashboard } from "lucide-react";
  import { motion, AnimatePresence } from "framer-motion";
  import { useAuth } from "@/contexts/AuthContext";
  import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import MegaMenu from "@/components/layout/MegaMenu";
import SearchDialog from "@/components/layout/SearchDialog";
import logoImage from "@/assets/logo-2.jpg";
import mobileLogoImage from "@/assets/mobile-logo.png";
import ThemeToggle from "@/components/layout/ThemeToggle";
 
 const navLinks = [
   { name: "Home", path: "/" },
   { name: "Shop", path: "/shop" },
   { name: "Categories", path: "/categories" },
   { name: "About", path: "/about" },
   { name: "Contact", path: "/contact" },
 ];
 
 const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
   const location = useLocation();
   const { user, signOut, loading: authLoading } = useAuth();
   const { itemCount, openCart } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
   const { isStaff, isAdmin, isModerator, loading: staffLoading } = useAdminAuth();
  const [mobileLogo, setMobileLogo] = useState<string | null>(null);

    useEffect(() => {
      supabase
        .from("site_content")
        .select("image_url")
        .eq("section_key", "mobile_logo")
        .eq("is_active", true)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.image_url) setMobileLogo(data.image_url);
        });
    }, []);
 
    useEffect(() => {
      const handleScroll = () => {
        setScrolled(window.scrollY > 50);
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Keyboard shortcut for search (Ctrl+K)
    useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          setSearchOpen(true);
        }
      };
      document.addEventListener("keydown", down);
      return () => document.removeEventListener("keydown", down);
    }, []);
 
   return (
     <header
       className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
         scrolled
           ? "bg-background/95 backdrop-blur-md border-b border-border"
           : "bg-transparent"
       }`}
     >
       <div className="container mx-auto px-4">
         <div className="flex items-center justify-between h-20">
           {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              {/* Mobile: round logo */}
               <img 
                 src={mobileLogo || mobileLogoImage} 
                 alt="Dubai Borka House Logo" 
                 className="h-11 w-11 rounded-full object-cover border-2 border-primary/30 md:hidden"
               />
               {/* Desktop: full logo */}
               <img 
                 src={logoImage} 
                 alt="Dubai Borka House Logo" 
                 className="hidden md:block h-14 w-auto object-contain dark:brightness-100 brightness-90 contrast-110"
               />
               <span className="font-display text-lg font-black tracking-widest md:hidden uppercase leading-tight text-white dark:text-white" style={{ textShadow: '0 0 8px hsl(var(--primary) / 0.6), 0 0 20px hsl(var(--primary) / 0.3), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>
                 DUBAI BORKA HOUSE
               </span>
            </Link>
 
           {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link
                to="/"
                className={`gold-underline text-sm font-medium tracking-wide uppercase transition-colors ${
                  location.pathname === "/" ? "text-primary" : "text-foreground hover:text-primary"
                }`}
              >
                Home
              </Link>
              <MegaMenu />
              {navLinks.filter(l => l.path !== "/" && l.path !== "/shop").map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`gold-underline text-sm font-medium tracking-wide uppercase transition-colors ${
                    location.pathname === link.path
                      ? "text-primary"
                      : "text-foreground hover:text-primary"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
 
           {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4">
              <ThemeToggle />
              <button onClick={() => setSearchOpen(true)} className="p-2 hover:bg-muted rounded-full transition-colors">
                <Search className="w-5 h-5 text-foreground" />
              </button>
              <Link to="/wishlist" className="relative p-2 hover:bg-muted rounded-full transition-colors">
                <Heart className="w-5 h-5 text-foreground" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-secondary-foreground text-xs flex items-center justify-center rounded-full">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>
               {user ? (
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <button className="p-2 hover:bg-muted rounded-full transition-colors">
                       <User className="w-5 h-5 text-primary" />
                     </button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="cursor-pointer">
                          <User className="w-4 h-4 mr-2" />
                          My Profile
                        </Link>
                      </DropdownMenuItem>
                      {!staffLoading && isStaff && (
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="cursor-pointer text-primary">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                             {isModerator && !isAdmin ? "Moderator Panel" : "Admin Panel"}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="cursor-pointer text-muted-foreground text-xs">
                          {user.email}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                       <LogOut className="w-4 h-4 mr-2" />
                       Sign Out
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
               ) : (
                 <Link to="/auth" className="p-2 hover:bg-muted rounded-full transition-colors">
                   <User className="w-5 h-5 text-foreground" />
                 </Link>
               )}
             <button
                onClick={openCart}
                className="relative p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-foreground" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs flex items-center justify-center rounded-full">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
              </button>
             <Link to="/shop" className="btn-gold ml-4 text-sm !py-2 !px-6">
               Shop Now
             </Link>
           </div>
 
           {/* Mobile Menu Button */}
           <button
             onClick={() => setIsOpen(!isOpen)}
             className="lg:hidden p-2 hover:bg-muted rounded-full transition-colors"
           >
             {isOpen ? (
               <X className="w-6 h-6 text-foreground" />
             ) : (
               <Menu className="w-6 h-6 text-foreground" />
             )}
           </button>
         </div>
       </div>
 
       {/* Mobile Menu */}
       <AnimatePresence>
         {isOpen && (
           <motion.div
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: "auto" }}
             exit={{ opacity: 0, height: 0 }}
             className="lg:hidden bg-background border-t border-border"
           >
             <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
               {navLinks.map((link) => (
                 <Link
                   key={link.path}
                   to={link.path}
                   onClick={() => setIsOpen(false)}
                   className={`py-3 px-4 rounded-lg text-lg font-medium transition-colors ${
                     location.pathname === link.path
                       ? "bg-muted text-primary"
                       : "text-foreground hover:bg-muted"
                   }`}
                 >
                   {link.name}
                 </Link>
               ))}
                 <div className="flex items-center gap-4 pt-4 border-t border-border mt-2">
                   <ThemeToggle />
                   <button onClick={() => { setIsOpen(false); setSearchOpen(true); }} className="flex-1 py-3 flex items-center justify-center gap-2 bg-muted rounded-lg">
                     <Search className="w-5 h-5" />
                     <span>Search</span>
                   </button>
                    <button
                      onClick={() => { setIsOpen(false); openCart(); }}
                      className="flex-1 py-3 flex items-center justify-center gap-2 bg-muted rounded-lg"
                    >
                    <ShoppingBag className="w-5 h-5" />
                      <span>Cart ({itemCount})</span>
                    </button>
                </div>
                 {user ? (
                    <>
                       {!staffLoading && isStaff && (
                        <Link
                          to="/admin"
                          onClick={() => setIsOpen(false)}
                          className="w-full py-3 flex items-center justify-center gap-2 bg-primary/20 text-primary rounded-lg mt-2 font-semibold"
                        >
                          <LayoutDashboard className="w-5 h-5" />
                           <span>{isModerator && !isAdmin ? "Moderator Panel" : "Admin Panel"}</span>
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="w-full py-3 flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-lg mt-2"
                      >
                        <User className="w-5 h-5" />
                        <span>My Profile</span>
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setIsOpen(false);
                        }}
                        className="w-full py-3 flex items-center justify-center gap-2 bg-destructive/10 text-destructive rounded-lg mt-2"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                      </button>
                    </>
                 ) : (
                   <Link
                     to="/auth"
                     onClick={() => setIsOpen(false)}
                     className="w-full py-3 flex items-center justify-center gap-2 bg-muted rounded-lg mt-2"
                   >
                     <User className="w-5 h-5" />
                     <span>Sign In</span>
                   </Link>
                 )}
               <Link
                 to="/shop"
                 onClick={() => setIsOpen(false)}
                 className="btn-gold text-center mt-2"
               >
                 Shop Now
               </Link>
             </nav>
           </motion.div>
         )}
       </AnimatePresence>
        {searchOpen && <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />}
      </header>
   );
 };
 
 export default Header;