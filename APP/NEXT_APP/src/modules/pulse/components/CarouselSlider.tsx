"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/components/ui/Button";

interface SlideItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface CarouselSliderProps {
  slides: SlideItem[];
  activeId: string;
  onActiveChange: (id: string) => void;
}

export function CarouselSlider({ slides, activeId, onActiveChange }: CarouselSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    slideRefs.current[activeId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [activeId]);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;

    const trackLeft = track.getBoundingClientRect().left;
    let closestId = activeId;
    let smallestDistance = Number.POSITIVE_INFINITY;

    for (const slide of slides) {
      const element = slideRefs.current[slide.id];
      if (!element) continue;

      const distance = Math.abs(element.getBoundingClientRect().left - trackLeft);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestId = slide.id;
      }
    }

    if (closestId !== activeId) {
      onActiveChange(closestId);
    }
  };

  const activeIndex = Math.max(
    0,
    slides.findIndex((slide) => slide.id === activeId)
  );

  const goToRelative = (direction: -1 | 1) => {
    const nextSlide = slides[activeIndex + direction];
    if (nextSlide) {
      onActiveChange(nextSlide.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {slides.map((slide) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => onActiveChange(slide.id)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm transition",
              activeId === slide.id
                ? "border-cyan-300/40 bg-cyan-300/15 text-white"
                : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            {slide.label}
          </button>
        ))}

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => goToRelative(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/75 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
            disabled={activeIndex === 0}
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goToRelative(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/75 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
            disabled={activeIndex === slides.length - 1}
            aria-label="Slide siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 scrollbar-hide"
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            ref={(element) => {
              slideRefs.current[slide.id] = element;
            }}
            className="min-w-full snap-start"
          >
            {slide.content}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        {slides.map((slide) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => onActiveChange(slide.id)}
            className={cn(
              "h-2.5 rounded-full transition-all",
              activeId === slide.id ? "w-10 bg-cyan-300" : "w-2.5 bg-white/20 hover:bg-white/40"
            )}
            aria-label={`Ir a ${slide.label}`}
          />
        ))}
      </div>
    </div>
  );
}
