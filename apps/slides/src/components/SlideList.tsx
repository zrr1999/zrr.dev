import { useState, useEffect } from "preact/hooks";

/** `client:*` is for Astro's tag typing only; the runtime strips these before hydration. */
export type SlideListProps = {
  slides: string[];
  "client:load"?: boolean;
  "client:idle"?: boolean;
  "client:visible"?: boolean;
  "client:media"?: string;
  "client:only"?: string | boolean;
};

/** Return widened where tooling expects React-like `ReactNode` instead of Preact `VNode`. */
export function SlideList({ slides }: SlideListProps): any {
  const [showWarning, setShowWarning] = useState(false);
  const [scale, setScale] = useState(1);
  const [fullscreenSlide, setFullscreenSlide] = useState<string | null>(null);

  // 响应式处理屏幕宽度
  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      if (w < 390) {
        setShowWarning(true);
        setScale(1);
      } else if (w >= 390 && w < 640) {
        setShowWarning(false);
        setScale(0.85);
      } else {
        setShowWarning(false);
        setScale(1);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleCardClick(slide: string, e: Event) {
    e.preventDefault();

    if (fullscreenSlide === slide) {
      restoreOriginalState(slide);
    } else {
      if (fullscreenSlide) restoreOriginalState(fullscreenSlide);
      enterFullscreen(slide);
    }
  }

  function enterFullscreen(slide: string) {
    document.body.style.overflow = "hidden";
    setFullscreenSlide(slide);

    const card = document.getElementById(`slide-card-${slide}`);
    if (!card) return;

    const cardRect = card.getBoundingClientRect();

    requestAnimationFrame(() => {
      card.style.transform = `translate(-${cardRect.left}px, -${cardRect.top}px)`;
      card.style.zIndex = "9999";
    });
  }

  function restoreOriginalState(slide: string) {
    document.body.style.overflow = "";
    setFullscreenSlide(null);

    const card = document.getElementById(`slide-card-${slide}`);
    if (!card) return;

    requestAnimationFrame(() => {
      card.style.transform = "";
    });
    setTimeout(() => {
      card.style.zIndex = "";
    }, 300);
  }

  return (
    <div class="flex min-h-svh flex-col bg-background font-mono text-foreground">
      <img
        id="background"
        src="/background.svg"
        fetchpriority="high"
        class="fixed inset-0 h-full w-full object-cover backdrop-blur-3xl"
      />

      <div
        class="z-1 flex min-h-[60vh] flex-1 items-center justify-center"
        hidden={!showWarning}
      >
        <div class="text-muted-foreground w-full p-8 text-center text-2xl">
          屏幕过窄，无法浏览幻灯片列表，请使用更大的屏幕。
        </div>
      </div>
      <main
        class="slide-list animate-slidein z-1 flex flex-1 items-start justify-center"
        hidden={showWarning}
        style={{
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top center",
        }}
      >
        <section
          id="hero"
          class="flex w-auto flex-col items-start justify-center p-4"
        >
          <h1 class="mt-16 mb-8 w-full text-center text-4xl font-bold text-foreground md:text-5xl">
            我的幻灯片集
          </h1>
          {slides.length > 0 && (
            <div class="grid w-full grid-cols-1 gap-16 md:grid-cols-2">
              {slides.map(slide => (
                <a
                  id={`slide-card-${slide}`}
                  href="#"
                  class={`block overflow-y-auto bg-white/50 no-underline backdrop-blur transition-all duration-300 dark:bg-muted/50 ${
                    fullscreenSlide === slide
                      ? "h-screen w-screen p-12"
                      : "h-[260px] w-[350px] rounded-2xl border border-border p-4 shadow hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-dashed"
                  }`}
                  onClick={e => handleCardClick(slide, e)}
                >
                  <h2
                    class={`m-0 text-center text-foreground transition-all duration-300 ${
                      fullscreenSlide === slide
                        ? "h-36 text-5xl font-bold"
                        : "h-12 text-2xl font-semibold"
                    }`}
                  >
                    {slide}
                  </h2>
                  <div class="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-border bg-gray-100 dark:bg-gray-800">
                    <iframe
                      src={`/slides/${slide}/index.html`}
                      class="h-full w-full rounded-xl border-0 transition-all duration-300"
                      loading="lazy"
                      title={`幻灯片预览-${slide}`}
                    ></iframe>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
      <style>
        {`
          .animate-slidein {
            animation: slidein 0.7s cubic-bezier(.4,0,.2,1);
          }
        `}
      </style>
    </div>
  );
}

export default SlideList;
