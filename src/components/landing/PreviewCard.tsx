import { useEffect, useState } from "react";
import {
  Instagram, Linkedin, Twitter, Facebook, Heart, MessageCircle,
  Send, Bookmark, MoreHorizontal, Share2, ThumbsUp, MessageSquare,
  Repeat, Globe
} from "lucide-react";

interface PreviewCardProps {
  platform: "instagram" | "linkedin" | "x" | "facebook";
}

export function PreviewCard({ platform }: PreviewCardProps) {
  const [data, setData] = useState({
    display_name: "",
    handle: "",
    content_text: "",
    image_url: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: featureData } = await supabase
          .from("feature_previews")
          .select("*")
          .eq("platform", platform)
          .single();

        if (featureData) {
          setData({
            display_name: featureData.display_name,
            handle: featureData.handle,
            content_text: featureData.content_text,
            image_url: featureData.image_url
          });
        }
      } catch (e) {
        console.error("Failed to fetch feature data", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [platform]);

  const renderContent = () => {
    const displayName = data.display_name || "Sarah Chen";
    const handle = data.handle || (platform === "instagram" ? "sarahcreates" : platform === "linkedin" ? "Content Strategist · 2h" : platform === "x" ? "@sarahcreates · 3h" : "Just now · 🌐");
    const text = data.content_text || "The future of social media management is here. Simple, fast, and unified.";
    const image = data.image_url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=60";

    const dims = platform === "linkedin" ? "1200×1200" : "1080×1080";
    const Icon = platform === "instagram" ? Instagram : platform === "linkedin" ? Linkedin : platform === "x" ? Twitter : Facebook;
    const iconColor = platform === "instagram" ? "text-pink-500" : platform === "linkedin" ? "text-blue-600" : platform === "x" ? "text-black" : "text-blue-600";

    return (
      <div className="flex flex-col h-full bg-white border-r border-border/50 last:border-0 min-h-[550px]">
        {/* Platform Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
            <span className="text-[11px] font-semibold text-gray-700 capitalize">{platform}</span>
          </div>
          <span className="text-[9px] font-mono text-gray-400 tabular-nums">{dims}</span>
        </div>

        {/* Post Content */}
        <div className="p-4 flex flex-col h-full">
          {/* User Profile */}
          <div className="flex items-center gap-3 mb-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden border border-border/50">
              <img src={image} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-bold text-gray-900 leading-tight truncate">{displayName}</p>
              <p className="text-[11px] text-gray-500 leading-tight truncate">{handle}</p>
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-h-[80px]">
            <p className="text-[12px] text-gray-800 leading-[1.5] line-clamp-6 mb-4">
              {text}
            </p>
          </div>

          {/* Post Image */}
          <div className="aspect-square w-full rounded-xl overflow-hidden border border-border shadow-sm mb-4 shrink-0 bg-gray-50">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>

          {/* Engagement Bar */}
          <div className="pt-3 border-t border-border/50 shrink-0">
            {platform === "instagram" ? (
              <div className="flex items-center gap-4 text-gray-400">
                <Heart className="w-4 h-4" />
                <MessageCircle className="w-4 h-4" />
                <Send className="w-4 h-4" />
                <Bookmark className="w-4 h-4 ml-auto" />
              </div>
            ) : platform === "x" ? (
              <div className="flex items-center justify-between text-gray-400 text-[10px] px-1">
                <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> 89</span>
                <span className="flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5" /> 247</span>
                <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> 1.2K</span>
                <Share2 className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="flex items-center justify-between text-gray-400 text-[10px]">
                <span className="flex items-center gap-1.5"><ThumbsUp className="w-3.5 h-3.5" /> Like</span>
                <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Comment</span>
                {platform === "linkedin" ? (
                  <span className="flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5" /> Repost</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5" /> Share</span>
                )}
                {platform === "linkedin" && <Send className="w-3.5 h-3.5" />}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex-1 h-[550px] bg-white animate-pulse border-r border-border/50 last:border-0" />
  );

  return renderContent();
}
