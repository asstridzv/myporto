import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "SDN 2 CAKRANEGARA",
    description: "2012-2018",
  },
  {
    number: "02",
    title: "SMPN 1 MATARAM",
    description: "2018-2021",
  },
  {
    number: "03",
    title: "SMAN 5 MATARAM",
    description: "2021-2023 (AKSELRATION)",
  },
  {
    number: "04",
    title: "UNIVERSITAS BUMIGORA",
    description: "2023-sekarang",
  },
];

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-background">
      <div className="mx-auto max-w-6xl px-6" ref={ref}>
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl" style={{ letterSpacing: "-0.02em" }}>
            Education
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                filter: visible ? "blur(0)" : "blur(4px)",
                transition: `all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 100}ms`,
              }}
            >
              <span className="text-4xl font-bold text-foreground/10">{step.number}</span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
