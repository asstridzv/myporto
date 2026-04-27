import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PinPost — Preview your social posts across every platform" },
      { name: "description", content: "See exactly how your content renders on Instagram, LinkedIn, X, and Facebook before you publish. One editor, four platforms, zero surprises." },
      { name: "author", content: "PinPost" },
      { property: "og:title", content: "PinPost — Preview your social posts across every platform" },
      { property: "og:description", content: "See exactly how your content renders on Instagram, LinkedIn, X, and Facebook before you publish. One editor, four platforms, zero surprises." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "PinPost — Preview your social posts across every platform" },
      { name: "twitter:description", content: "See exactly how your content renders on Instagram, LinkedIn, X, and Facebook before you publish. One editor, four platforms, zero surprises." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/b9uXYmgdTyWTYhHfslbu4ZrHRZ73/social-images/social-1775640762687-pinpost.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/b9uXYmgdTyWTYhHfslbu4ZrHRZ73/social-images/social-1775640762687-pinpost.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Miranda+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground">The page you are looking for doesn't exist or has been moved.</p>
      <a href="/" className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
        Back to Home
      </a>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
