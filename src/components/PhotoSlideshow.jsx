import { useEffect, useRef, useState } from "react";

/**
 * Autoplaying background slideshow: crossfades between photos with a slow
 * Ken Burns pan/zoom on the active frame. Images are sourced from
 * /public/photos — drop real photos in with the same file names (or edit
 * the `images` list below) and the slideshow picks them up with no other
 * changes.
 */
const DEFAULT_IMAGES = ["/photos/slide-1.jpg", "/photos/slide-2.jpg", "/photos/slide-3.jpg"];
const INTERVAL = 6000;

export default function PhotoSlideshow({ images = DEFAULT_IMAGES, interval = INTERVAL }) {
  const [active, setActive] = useState(0);
  const visible = useRef(true);

  useEffect(() => {
    const onVis = () => { visible.current = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);
    if (images.length < 2) return () => document.removeEventListener("visibilitychange", onVis);
    const id = setInterval(() => {
      if (visible.current) setActive((i) => (i + 1) % images.length);
    }, interval);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [images, interval]);

  return (
    <div className="slideshow" aria-hidden="true">
      {images.map((src, i) => (
        <div
          key={src}
          className={`slideshow__frame ${i === active ? "is-active" : ""}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="slideshow__scrim" />
      {images.length > 1 && (
        <div className="slideshow__dots">
          {images.map((_, i) => (
            <span key={i} className={`slideshow__dot ${i === active ? "is-active" : ""}`} />
          ))}
        </div>
      )}
    </div>
  );
}
