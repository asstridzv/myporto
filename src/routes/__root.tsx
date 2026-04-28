import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";

import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Astrid Ekaningsih — Portfolio" },
      { name: "description", content: "Portfolio of Astrid Ekaningsih. See exactly how content renders on Instagram, LinkedIn, X, and Facebook before you publish." },
      { name: "author", content: "Astrid Ekaningsih" },
      { property: "og:title", content: "Astrid Ekaningsih — Portfolio" },
      { property: "og:description", content: "Portfolio of Astrid Ekaningsih. See exactly how content renders on Instagram, LinkedIn, X, and Facebook before you publish." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Astrid Ekaningsih — Portfolio" },
      { name: "twitter:description", content: "Portfolio of Astrid Ekaningsih. See exactly how content renders on Instagram, LinkedIn, X, and Facebook before you publish." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/b9uXYmgdTyWTYhHfslbu4ZrHRZ73/social-images/social-1775640762687-pinpost.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/b9uXYmgdTyWTYhHfslbu4ZrHRZ73/social-images/social-1775640762687-pinpost.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "google-site-verification", content: "googlea769583200c6706d" },
      { name: "keywords", content: "Astrid Ekaningsih, Astrid Ekaningsih Portfolio, Social Media Marketing, Content Preview Tool, Social Sight Pro, Digital Creator Portfolio" },
    ],
    links: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" },
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
