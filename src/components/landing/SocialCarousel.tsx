import { useEffect, useState } from "react";
import carousel1 from "@/assets/carousel-1.jpg";
import carousel2 from "@/assets/carousel-2.jpg";
import carousel3 from "@/assets/carousel-3.jpg";
import carousel4 from "@/assets/carousel-4.jpg";
import carousel6 from "@/assets/carousel-6.jpg";
import carousel7 from "@/assets/carousel-7.jpg";

const fallbackImages = [carousel1, carousel2, carousel3, carousel4, carousel6, carousel7];

export function SocialCarousel() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase
          .from("carousel_images")
          .select("image_url")
          .order("sort_order", { ascending: true });

        if (data && data.length > 0) {
          setImages(data.map(img => img.image_url));
        } else {
          setImages(fallbackImages);
        }
      } catch (e) {
        console.error("Failed to load carousel images", e);
        setImages(fallbackImages);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Duplicate for seamless loop
  const allImages = [...images, ...images, ...images];

  if (loading) return <div className="h-[400px] w-full animate-pulse bg-muted rounded-2xl" />;

  return (
    <div className="mt-20 overflow-hidden opacity-0 animate-scale-in">
      <div className="flex gap-4 animate-carousel-scroll">
        {allImages.map((src, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[200px] md:w-[240px] aspect-[9/16] rounded-2xl overflow-hidden shadow-lg border border-border/50 bg-card"
          >
            <img
              src={src}
              alt="Social media post example"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

