import logoPinpost from "@/assets/logo-pinpost.png";

export function FooterSection() {
  return (
    <footer className="bg-foreground py-16 text-background">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center text-center gap-4">
          <img src={logoPinpost} alt="PinPost" className="h-8 w-auto brightness-0 invert" />
          <p className="text-sm text-background/70 max-w-md">
            Precision previews for modern marketing teams. Built for creators who care about how their content looks.
          </p>
          <p className="text-xs text-background/40 mt-4">
            © {new Date().getFullYear()} PinPost. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
