import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProductZoomViewer from "./ProductZoomViewer";
import { isEmbedVideo, getEmbedUrl } from "@/lib/video-utils";

interface ProductGalleryProps {
  mainImage: string;
  images: { id: string; image_url: string; alt_text?: string | null }[];
  videoUrl?: string | null;
  productName: string;
  discount?: number;
  children?: React.ReactNode;
}

const ProductGallery = ({ mainImage, images, videoUrl, productName, discount, children }: ProductGalleryProps) => {
  const allImages = [mainImage, ...images.map((img) => img.image_url)];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const currentImage = allImages[selectedIndex] || mainImage;
  const isEmbed = videoUrl ? isEmbedVideo(videoUrl) : false;

  const goNext = () => setSelectedIndex((i) => (i + 1) % allImages.length);
  const goPrev = () => setSelectedIndex((i) => (i - 1 + allImages.length) % allImages.length);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) goNext();
      else goPrev();
      setShowVideo(false);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [allImages.length]);

  const handlePlayVideo = useCallback(() => {
    setShowVideo(true);
    if (isEmbed) {
      setVideoLoading(true);
      setIsPlaying(true);
    } else {
      setVideoLoading(true);
      setIsPlaying(true);
      setTimeout(() => {
        videoRef.current?.play().catch(() => {});
      }, 100);
    }
  }, [isEmbed]);

  const toggleVideoPlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleFullscreen = useCallback(() => {
    if (isEmbed && iframeRef.current?.requestFullscreen) {
      iframeRef.current.requestFullscreen();
    } else if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  }, [isEmbed]);

  const renderVideoContent = () => {
    if (!videoUrl) return null;

    if (isEmbed) {
      const embedUrl = getEmbedUrl(videoUrl);
      if (!embedUrl) return null;
      return (
        <motion.div
          key="embed-video-player"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="aspect-[3/4] rounded-2xl overflow-hidden bg-foreground/5 relative group"
        >
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title={productName}
            onLoad={() => setVideoLoading(false)}
          />
          {videoLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/30 z-10">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {/* Fullscreen button for embed */}
          <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleFullscreen}
              className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
            >
              <Maximize className="w-3.5 h-3.5 text-foreground" />
            </button>
          </div>
        </motion.div>
      );
    }

    // Native video player
    return (
      <motion.div
        key="native-video-player"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="aspect-[3/4] rounded-2xl overflow-hidden bg-foreground/5 relative group"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          muted={isMuted}
          loop
          playsInline
          className="w-full h-full object-contain"
          onCanPlay={() => setVideoLoading(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {videoLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30 z-10">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-foreground/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleVideoPlay}
              className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4 text-foreground" /> : <Play className="w-4 h-4 ml-0.5 text-foreground" />}
            </button>
            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-foreground" /> : <Volume2 className="w-3.5 h-3.5 text-foreground" />}
            </button>
            <button
              onClick={handleFullscreen}
              className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
            >
              <Maximize className="w-3.5 h-3.5 text-foreground" />
            </button>
          </div>
        </div>

        {!isPlaying && !videoLoading && (
          <button
            onClick={toggleVideoPlay}
            className="absolute inset-0 flex items-center justify-center z-[5]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl"
            >
              <Play className="w-7 h-7 text-primary-foreground ml-1" />
            </motion.div>
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <div
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          {showVideo && videoUrl ? (
            renderVideoContent()
          ) : (
            <motion.div
              key={`image-${selectedIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <ProductZoomViewer src={currentImage} alt={productName} discount={discount}>
                {children}
              </ProductZoomViewer>
            </motion.div>
          )}
        </AnimatePresence>

        {allImages.length > 1 && !showVideo && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {allImages.length > 1 && !showVideo && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 lg:hidden z-10">
            {allImages.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === selectedIndex ? "bg-primary w-4" : "bg-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
        {allImages.map((img, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setSelectedIndex(index); setShowVideo(false); setIsPlaying(false); }}
            className={`flex-shrink-0 w-[72px] h-[90px] rounded-xl overflow-hidden border-2 transition-all duration-300 ${
              selectedIndex === index && !showVideo
                ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                : "border-border/50 hover:border-primary/40"
            }`}
          >
            <img src={img} alt={`${productName} ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </motion.button>
        ))}

        {videoUrl && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayVideo}
            className={`flex-shrink-0 w-[72px] h-[90px] rounded-xl overflow-hidden border-2 transition-all duration-300 flex items-center justify-center bg-muted relative ${
              showVideo ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10" : "border-border/50 hover:border-primary/40"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
            <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center relative z-10">
              <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
            </div>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default ProductGallery;
