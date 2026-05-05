import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Volume2, VolumeX, Maximize, ShoppingBag, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isEmbedVideo, getEmbedUrl } from "@/lib/video-utils";

const VideoShowcase = () => {
  const { data: products = [] } = useQuery({
    queryKey: ["video-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, image_url, video_url, price, sale_price, category")
        .not("video_url", "is", null)
        .neq("video_url", "")
        .limit(6);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [mutedMap, setMutedMap] = useState<Record<string, boolean>>({});
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const togglePlay = useCallback((id: string, videoUrl?: string | null) => {
    if (playingId === id) {
      if (videoUrl && !isEmbedVideo(videoUrl)) {
        videoRefs.current[id]?.pause();
      }
      setPlayingId(null);
    } else {
      if (playingId && videoRefs.current[playingId]) {
        videoRefs.current[playingId]!.pause();
      }
      setPlayingId(id);
      if (videoUrl && isEmbedVideo(videoUrl)) {
        setLoadingVideo(false);
      } else {
        setLoadingVideo(true);
        setTimeout(() => {
          const vid = videoRefs.current[id];
          if (vid) {
            vid.play().then(() => setLoadingVideo(false)).catch(() => setLoadingVideo(false));
          }
        }, 50);
      }
    }
  }, [playingId]);

  const toggleMute = useCallback((id: string) => {
    setMutedMap(prev => {
      const newMuted = !prev[id];
      if (videoRefs.current[id]) videoRefs.current[id]!.muted = newMuted;
      return { ...prev, [id]: newMuted };
    });
  }, []);

  const toggleFullscreen = useCallback((id: string) => {
    const video = videoRefs.current[id];
    if (video?.requestFullscreen) video.requestFullscreen();
  }, []);

  const featured = products.length > 0 ? (featuredId ? products.find(p => p.id === featuredId) : products[0]) : null;
  const others = products.filter(p => p.id !== featured?.id);

  const renderVideoPlayer = (product: NonNullable<typeof featured>) => {
    const url = product.video_url;
    if (!url) return null;

    if (isEmbedVideo(url)) {
      const embedUrl = getEmbedUrl(url);
      if (!embedUrl) return null;
      return (
        <motion.div
          key="embed-video"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title={product.name}
            onLoad={() => setLoadingVideo(false)}
          />
        </motion.div>
      );
    }

    return (
      <motion.div
        key="native-video"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0"
      >
        <video
          ref={el => { videoRefs.current[product.id] = el; }}
          src={url}
          muted={mutedMap[product.id] !== false}
          loop
          playsInline
          className="w-full h-full object-cover"
          onCanPlay={() => setLoadingVideo(false)}
        />
      </motion.div>
    );
  };

  const isEmbed = featured?.video_url ? isEmbedVideo(featured.video_url) : false;

  return (
    <section className="py-12 md:py-20 bg-gradient-to-b from-background to-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-3">
            <Play className="w-4 h-4" /> Video Showcase
          </div>
          <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground">See Products in Action</h2>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">Watch real product videos to see quality, fit, and details before you buy</p>
        </motion.div>

        {products.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Videos Coming Soon!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              We're preparing product videos so you can see the quality and details up close. Stay tuned!
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {featured && (
              <motion.div
                key={featured.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="lg:col-span-2 rounded-2xl overflow-hidden bg-card border border-border group relative shadow-lg"
              >
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <AnimatePresence mode="wait">
                    {playingId === featured.id && featured.video_url
                      ? renderVideoPlayer(featured)
                      : (
                        <motion.img
                          key="image"
                          initial={{ opacity: 0, scale: 1.05 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          src={featured.image_url || "/placeholder.svg"}
                          alt={featured.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                  </AnimatePresence>

                  {loadingVideo && playingId === featured.id && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  {/* Bottom controls - hide for embed videos since they have their own */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between transition-opacity duration-300 z-10 ${
                      playingId === featured.id && isEmbed ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {!isEmbed && (
                        <>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all"
                            onClick={() => togglePlay(featured.id, featured.video_url)}
                          >
                            {playingId === featured.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </Button>
                          {playingId === featured.id && (
                            <div className="flex items-center gap-1.5">
                              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm" onClick={() => toggleMute(featured.id)}>
                                {mutedMap[featured.id] !== false ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                              </Button>
                              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm" onClick={() => toggleFullscreen(featured.id)}>
                                <Maximize className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <Link to={`/product/${featured.slug || featured.id}`}>
                      <Button size="sm" className="gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5" /> View Product
                      </Button>
                    </Link>
                  </div>

                  {/* Center play button */}
                  {playingId !== featured.id && (
                    <button
                      onClick={() => togglePlay(featured.id, featured.video_url)}
                      className="absolute inset-0 flex items-center justify-center z-10"
                    >
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                      >
                        <Play className="w-7 h-7 md:w-8 md:h-8 text-primary-foreground ml-1" />
                      </motion.div>
                    </button>
                  )}
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="inline-block text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded mb-1">{featured.category}</span>
                    <h3 className="font-semibold text-foreground">{featured.name}</h3>
                  </div>
                  <div className="text-right">
                    {featured.sale_price ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through text-sm">৳{featured.price}</span>
                        <span className="text-primary font-bold text-lg">৳{featured.sale_price}</span>
                      </div>
                    ) : (
                      <span className="text-primary font-bold text-lg">৳{featured.price}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-hide">
              {others.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className={`rounded-xl overflow-hidden bg-card border transition-all duration-200 cursor-pointer group/item ${
                    featuredId === product.id ? "border-primary ring-1 ring-primary/30 shadow-md" : "border-border hover:border-primary/50 hover:shadow-sm"
                  }`}
                  onClick={() => {
                    setFeaturedId(product.id);
                    setPlayingId(null);
                  }}
                >
                  <div className="flex gap-3 p-2">
                    <div className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 group-hover/item:bg-foreground/30 transition-colors">
                        <Play className="w-5 h-5 text-background" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <h4 className="text-sm font-medium text-foreground truncate">{product.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-primary font-bold text-sm">৳{product.sale_price || product.price}</span>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Eye className="w-3 h-3" /> Watch
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {others.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">More video products coming soon!</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default VideoShowcase;
