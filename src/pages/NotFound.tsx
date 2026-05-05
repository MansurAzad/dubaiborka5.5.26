import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/seo/SEOHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="পেজ পাওয়া যায়নি — 404" noIndex />
      <Header />
      <main className="flex-1 flex items-center justify-center pt-24 pb-20">
        <div className="text-center px-4 max-w-lg">
          <h1 className="text-8xl font-display font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-3">পেজ পাওয়া যায়নি</h2>
          <p className="text-muted-foreground mb-8">
            দুঃখিত, আপনি যে পেজটি খুঁজছেন তা পাওয়া যায়নি। পেজটি সরানো হয়েছে অথবা ঠিকানা ভুল হতে পারে।
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Home className="w-4 h-4" />
              হোমপেজে যান
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
            >
              <Search className="w-4 h-4" />
              শপ ব্রাউজ করুন
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
