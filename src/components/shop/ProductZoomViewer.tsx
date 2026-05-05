import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, X } from "lucide-react";

interface ProductZoomViewerProps {
  src: string;
  alt: string;
  discount?: number;
  children?: React.ReactNode;
}

const ProductZoomViewer = ({ src, alt, discount, children }: ProductZoomViewerProps) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0, visible: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (isZoomed) {
        setPosition({ x, y });
      }
      setLensPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
    },
    [isZoomed]
  );

  const handleMouseLeave = () => {
    setLensPos((prev) => ({ ...prev, visible: false }));
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
    if (isZoomed) {
      setZoomLevel(1);
      setPosition({ x: 50, y: 50 });
    } else {
      setZoomLevel(2.5);
    }
  };

  const adjustZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(5, Math.max(1, prev + delta)));
    if (zoomLevel + delta <= 1) setIsZoomed(false);
    else setIsZoomed(true);
  };

  return (
    <>
      <div className="relative group">
        <div
          ref={containerRef}
          className="aspect-[3/4] rounded-2xl overflow-hidden bg-muted cursor-crosshair relative"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={toggleZoom}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover transition-transform duration-300"
            style={
              isZoomed
                ? {
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: `${position.x}% ${position.y}%`,
                  }
                : undefined
            }
            fetchPriority="high"
            decoding="async"
          />

          {/* Magnifier lens indicator */}
          {lensPos.visible && !isZoomed && (
            <div
              className="absolute w-24 h-24 border-2 border-primary/50 rounded-full pointer-events-none bg-primary/5"
              style={{
                left: lensPos.x - 48,
                top: lensPos.y - 48,
              }}
            />
          )}

          {/* Zoom indicator */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  adjustZoom(-0.5);
                }}
                className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-foreground">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  adjustZoom(0.5);
                }}
                className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {isZoomed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomed(false);
                    setZoomLevel(1);
                  }}
                  className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreen(true);
                }}
                className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {discount !== undefined && discount > 0 && (
          <span className="absolute top-4 left-4 px-4 py-2 rounded-full text-sm font-semibold bg-secondary text-secondary-foreground z-10">
            {discount}% OFF
          </span>
        )}

        {/* Overlay children (wishlist button etc.) */}
        {children}

        {/* Tap hint on mobile */}
        <p className="text-center text-xs text-muted-foreground mt-2 lg:hidden">
          ট্যাপ করে জুম করুন
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2 hidden lg:block">
          ক্লিক করে জুম · মাউস মুভ করে পজিশন
        </p>
      </div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-lg flex items-center justify-center"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductZoomViewer;
