import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
import {
  Trash2, LogOut, Shield, Globe, Lock, Clock, Users, FileText,
  Image as ImageIcon, ArrowLeft, Search, Filter, Upload, Plus, X
} from "lucide-react";
import logoPinpost from "@/assets/logo-pinpost.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

interface AdminDraft {
  id: string;
  title: string;
  text: string;
  format_key: string;
  is_public: boolean;
  updated_at: string;
  user_id: string;
  profile?: {
    display_name: string;
    handle: string;
    avatar_url: string;
  };
}

interface CarouselImage {
  id: string;
  storage_path: string;
  image_url: string;
}

interface FeaturePreview {
  platform: string;
  display_name: string;
  handle: string;
  content_text: string;
  image_url: string;
  storage_path: string;
}

function AdminPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [drafts, setDrafts] = useState<AdminDraft[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPublic, setFilterPublic] = useState<"all" | "public" | "private">("all");
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [uploadingCarousel, setUploadingCarousel] = useState(false);
  const [featurePreviews, setFeaturePreviews] = useState<FeaturePreview[]>([]);
  const [editingFeature, setEditingFeature] = useState<FeaturePreview | null>(null);
  const [savingFeature, setSavingFeature] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.rpc("has_role", { _role: "admin" });
        setIsAdmin(data === true);
      } catch (e) {
        console.error("Failed to check admin role", e);
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    })();
  }, [user]);

  // Redirect non-admins
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
    if (!loading && !checkingRole && !isAdmin && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, checkingRole, isAdmin, navigate]);

  // Load all drafts
  useEffect(() => {
    if (!user || !isAdmin) return;
    let mounted = true;

    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");

        const { data: draftsData, error } = await supabase
          .from("drafts")
          .select("id, title, text, format_key, is_public, updated_at, user_id")
          .order("updated_at", { ascending: false });

        if (error || !draftsData || !mounted) {
          if (mounted) setLoadingData(false);
          return;
        }

        // Get unique user IDs and fetch their profiles
        const userIds = [...new Set(draftsData.map((d) => d.user_id))];
        const profileMap: Record<string, AdminDraft["profile"]> = {};

        for (const uid of userIds) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("display_name, handle, avatar_url")
            .eq("id", uid)
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
            profileMap[uid] = {
              display_name: profileData.display_name || "",
              handle: profileData.handle || "",
              avatar_url: avatarUrl,
            };
          }
        }

        const enriched = draftsData.map((d) => ({
          ...d,
          profile: profileMap[d.user_id],
        }));

        if (mounted) {
          setDrafts(enriched);
          setLoadingData(false);
        }

        // Fetch carousel images
        const { data: carouselData } = await supabase
          .from("carousel_images")
          .select("*")
          .order("sort_order", { ascending: true });

        if (mounted && carouselData) {
          setCarouselImages(carouselData);
        }

        // Fetch feature previews
        const { data: featureData } = await supabase
          .from("feature_previews")
          .select("*");

        if (mounted && featureData) {
          setFeaturePreviews(featureData);
        }
      } catch (e) {
        console.error("Failed to load admin data", e);
        if (mounted) setLoadingData(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user, isAdmin]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return;

    setDeleting((prev) => new Set(prev).add(id));
    try {
      const { supabase } = await import("@/integrations/supabase/client");

      // Delete media files from storage first
      const { data: mediaData } = await supabase
        .from("draft_media")
        .select("storage_path")
        .eq("draft_id", id);

      if (mediaData && mediaData.length > 0) {
        const paths = mediaData.map((m) => m.storage_path);
        await supabase.storage.from("draft-media").remove(paths);
      }

      // Delete draft (cascade will remove draft_media rows)
      await supabase.from("drafts").delete().eq("id", id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error("Failed to delete draft", e);
      alert("Failed to delete post. Please try again.");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const togglePublish = useCallback(async (id: string, currentlyPublic: boolean) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("drafts").update({ is_public: !currentlyPublic }).eq("id", id);
      setDrafts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_public: !currentlyPublic } : d))
      );
    } catch (e) {
      console.error("Failed to toggle publish", e);
    }
  }, []);

  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCarousel(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `carousel/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('carousel')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('carousel')
        .getPublicUrl(filePath);

      const { data: newImage, error: dbError } = await supabase
        .from('carousel_images')
        .insert([{ storage_path: filePath, image_url: publicUrl }])
        .select()
        .single();

      if (dbError) throw dbError;

      setCarouselImages(prev => [...prev, newImage]);
    } catch (err) {
      console.error('Error uploading carousel image:', err);
      alert('Upload failed');
    } finally {
      setUploadingCarousel(false);
    }
  };

  const deleteCarouselImage = async (id: string, path: string) => {
    if (!confirm('Delete this carousel image?')) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.storage.from('carousel').remove([path]);
      await supabase.from('carousel_images').delete().eq('id', id);
      setCarouselImages(prev => prev.filter(img => img.id !== id));
    } catch (err) {
      console.error('Error deleting carousel image:', err);
    }
  };

  const handleUpdateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature) return;

    setSavingFeature(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from('feature_previews')
        .update({
          display_name: editingFeature.display_name,
          handle: editingFeature.handle,
          content_text: editingFeature.content_text,
          updated_at: new Date().toISOString()
        })
        .eq('platform', editingFeature.platform);

      if (error) throw error;

      setFeaturePreviews(prev => prev.map(f => f.platform === editingFeature.platform ? editingFeature : f));
      setEditingFeature(null);
    } catch (err) {
      console.error('Error updating feature:', err);
      alert('Update failed');
    } finally {
      setSavingFeature(false);
    }
  };

  const handleFeatureImageUpload = async (platform: string, file: File) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const fileExt = file.name.split('.').pop();
      const fileName = `feature-${platform}-${Date.now()}.${fileExt}`;
      const filePath = `carousel/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('carousel')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('carousel')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('feature_previews')
        .update({ storage_path: filePath, image_url: publicUrl })
        .eq('platform', platform);

      if (dbError) throw dbError;

      setFeaturePreviews(prev => prev.map(f => f.platform === platform ? { ...f, storage_path: filePath, image_url: publicUrl } : f));
    } catch (err) {
      console.error('Error uploading feature image:', err);
      alert('Image upload failed');
    }
  };

  // Filter & search
  const filteredDrafts = drafts.filter((d) => {
    if (filterPublic === "public" && !d.is_public) return false;
    if (filterPublic === "private" && d.is_public) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (d.title || "").toLowerCase().includes(q) ||
        (d.text || "").toLowerCase().includes(q) ||
        (d.profile?.display_name || "").toLowerCase().includes(q) ||
        (d.profile?.handle || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading || checkingRole || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const publicCount = drafts.filter((d) => d.is_public).length;
  const privateCount = drafts.filter((d) => !d.is_public).length;
  const uniqueUsers = new Set(drafts.map((d) => d.user_id)).size;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-white px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <img src={logoPinpost} alt="PinPost" className="h-7 w-auto" />
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <Shield className="h-3 w-3" />
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-12">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium">Total Posts</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{drafts.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium">Published / Private</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {publicCount} <span className="text-sm text-muted-foreground">/ {privateCount}</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Users</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{uniqueUsers}</p>
          </div>
        </div>

        {/* Carousel Management */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Landing Page Carousel
            </h2>
            <label className="cursor-pointer">
              <input type="file" className="hidden" accept="image/*" onChange={handleCarouselUpload} disabled={uploadingCarousel} />
              <Button size="sm" className="gap-2" disabled={uploadingCarousel} asChild>
                <span>
                  {uploadingCarousel ? <div className="h-3 w-3 animate-spin border-2 border-white border-t-transparent rounded-full" /> : <Plus className="h-4 w-4" />}
                  Add Image
                </span>
              </Button>
            </label>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
            {carouselImages.map((img) => (
              <div key={img.id} className="relative group flex-shrink-0">
                <img src={img.image_url} alt="" className="h-24 w-40 object-cover rounded-lg border border-border" />
                <button
                  onClick={() => deleteCarouselImage(img.id, img.storage_path)}
                  className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {carouselImages.length === 0 && !uploadingCarousel && (
              <div className="flex h-24 w-full items-center justify-center border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground">
                No carousel images. Add some to show on landing page.
              </div>
            )}
          </div>
        </section>

        {/* Feature Preview Editor */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Landing Page Feature Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featurePreviews.map((feature) => (
              <div key={feature.platform} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary uppercase">{feature.platform[0]}</span>
                    </div>
                    <span className="font-semibold capitalize">{feature.platform}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditingFeature(feature)}>
                    Edit Content
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group aspect-square rounded-lg bg-muted overflow-hidden border border-border">
                    {feature.image_url ? (
                      <img src={feature.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFeatureImageUpload(feature.platform, e.target.files[0])} />
                      <Upload className="h-5 w-5 text-white" />
                    </label>
                  </div>
                  <div className="space-y-1.5 overflow-hidden text-xs">
                    <p className="font-bold truncate">{feature.display_name || "No name"}</p>
                    <p className="text-muted-foreground truncate">@{feature.handle || "no_handle"}</p>
                    <p className="line-clamp-4 text-muted-foreground/80 italic">"{feature.content_text}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Edit Feature Modal */}
        {editingFeature && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold capitalize">Edit {editingFeature.platform} Preview</h3>
                <button onClick={() => setEditingFeature(null)}><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleUpdateFeature} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Display Name</label>
                  <input
                    value={editingFeature.display_name}
                    onChange={e => setEditingFeature({ ...editingFeature, display_name: e.target.value })}
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Handle / Subtitle</label>
                  <input
                    value={editingFeature.handle}
                    onChange={e => setEditingFeature({ ...editingFeature, handle: e.target.value })}
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                    placeholder="e.g. janedoe_design"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Content Text</label>
                  <textarea
                    rows={3}
                    value={editingFeature.content_text}
                    onChange={e => setEditingFeature({ ...editingFeature, content_text: e.target.value })}
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                    placeholder="The text that appears in the post..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingFeature(null)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={savingFeature}>
                    {savingFeature ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, users..."
              className="w-full rounded-lg border border-input bg-transparent pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            {(["all", "public", "private"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterPublic(f)}
                className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  filterPublic === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Table */}
        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No posts found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface text-xs text-muted-foreground">
                  <th className="py-3 px-4 text-left font-medium">Post</th>
                  <th className="py-3 px-4 text-left font-medium">Author</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-left font-medium">Date</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrafts.map((draft) => (
                  <tr
                    key={draft.id}
                    className="border-b border-border/50 last:border-0 transition-colors hover:bg-accent/30"
                  >
                    {/* Post */}
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-foreground truncate max-w-[250px]">
                        {draft.title || "Untitled draft"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[250px] mt-0.5">
                        {draft.text?.slice(0, 80) || "Empty"}
                      </p>
                    </td>

                    {/* Author */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                          {draft.profile?.avatar_url ? (
                            <img
                              src={draft.profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-muted-foreground">
                              {(draft.profile?.display_name || "U")[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {draft.profile?.display_name || "Unknown"}
                          </p>
                          {draft.profile?.handle && (
                            <p className="text-[10px] text-muted-foreground">
                              @{draft.profile.handle}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => togglePublish(draft.id, draft.is_public)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          draft.is_public
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {draft.is_public ? (
                          <>
                            <Globe className="h-2.5 w-2.5" /> Published
                          </>
                        ) : (
                          <>
                            <Lock className="h-2.5 w-2.5" /> Private
                          </>
                        )}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(draft.updated_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 gap-2 text-xs font-medium shadow-sm transition-all active:scale-95"
                        onClick={() => handleDelete(draft.id)}
                        disabled={deleting.has(draft.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deleting.has(draft.id) ? "Deleting…" : "Delete"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
