import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, MessageSquare, Heart, Eye, ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface PublicPost {
  id: string;
  title: string;
  text: string;
  format_key: string;
  updated_at: string;
  user_id: string;
  profile?: {
    display_name: string;
    handle: string;
    avatar_url: string;
  };
  thumbnail?: string;
}

export function GallerySection() {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");

        // Fetch public drafts with profile info
        const { data: draftsData, error } = await supabase
          .from("drafts")
          .select("id, title, text, format_key, updated_at, user_id")
          .eq("is_public", true)
          .order("updated_at", { ascending: false })
          .limit(6);

        if (error || !draftsData || !mounted) {
          if (mounted) setLoading(false);
          return;
        }

        // Fetch profiles and thumbnails for each post
        const enrichedPosts: PublicPost[] = [];
        for (const draft of draftsData) {
          const post: PublicPost = { ...draft };

          // Get profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("display_name, handle, avatar_url")
            .eq("id", draft.user_id)
            .single();

          if (!mounted) return;

          if (profileData) {
            let avatarUrl = profileData.avatar_url || "";
            if (avatarUrl && !avatarUrl.startsWith("http")) {
              const { data: signedData } = await supabase.storage
                .from("avatars")
                .createSignedUrl(avatarUrl, 3600);
              avatarUrl = signedData?.signedUrl || "";
            }
            post.profile = {
              display_name: profileData.display_name || "User",
              handle: profileData.handle || "",
              avatar_url: avatarUrl,
            };
          }

          // Get first image thumbnail
          const { data: mediaData } = await supabase
            .from("draft_media")
            .select("storage_path, file_type")
            .eq("draft_id", draft.id)
            .eq("file_type", "image")
            .eq("uploaded", true)
            .order("sort_order", { ascending: true })
            .limit(1);

          if (!mounted) return;

          if (mediaData && mediaData.length > 0) {
            const { data: signedData } = await supabase.storage
              .from("draft-media")
              .createSignedUrl(mediaData[0].storage_path, 3600);
            if (signedData?.signedUrl) {
              post.thumbnail = signedData.signedUrl;
            }
          }

          enrichedPosts.push(post);
        }

        if (mounted) {
          setPosts(enrichedPosts);
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load gallery", e);
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Don't render the section at all if there are no public posts and we're done loading
  if (!loading && posts.length === 0) return null;

  return (
    <section id="gallery" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6" ref={ref}>
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
            <Globe className="h-3 w-3" />
            Showcase
          </div>
          <h2
            className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            See what i made
          </h2>
          <p className="mt-4 text-muted-foreground">
            Here is my portfolio.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post, i) => (
              <article
                key={post.id}
                className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(24px)",
                  transition: `all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 80}ms`,
                }}
              >
                {/* Thumbnail */}
                <div className="relative h-48 w-full bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
                  {post.thumbnail ? (
                    <img
                      src={post.thumbnail}
                      alt={post.title || "Post preview"}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-8 w-8 text-primary/20 mx-auto" />
                        <span className="text-xs text-muted-foreground/60 mt-2 block">Text post</span>
                      </div>
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  {/* Author */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-8 w-8 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                      {post.profile?.avatar_url ? (
                        <img
                          src={post.profile.avatar_url}
                          alt={post.profile.display_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                          {(post.profile?.display_name || "U")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {post.profile?.display_name || "Creator"}
                      </p>
                      {post.profile?.handle && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          @{post.profile.handle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Title & Text */}
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1 mb-1">
                    {post.title || "Untitled post"}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                    {post.text || ""}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(post.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-2 text-muted-foreground/50">
                      <Heart className="h-3 w-3" />
                      <Eye className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}


      </div>
    </section>
  );
}
