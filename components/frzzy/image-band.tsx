import React from 'react';

/**
 * Full-width (or framed) image section with text over it, in the spirit of studio sites that
 * break the page into image "chapters".
 *
 * The image is shown in greyscale and tinted with the active palette's accent, so one image
 * suits every palette. ✏️ Swap `src` for real project renders/stills whenever you have them
 * (any size; it is cropped with object-fit: cover). Current images are original FRZZY renders in
 * /public/assets/frzzy/.
 */
export function ImageBand({
  src,
  eyebrow,
  title,
  body,
  variant = 'bleed',
  position = 'center',
  children,
}: {
  src: string;
  eyebrow?: string;
  title: React.ReactNode;
  body?: string;
  /** bleed: edge-to-edge band. framed: inside the page width, like a window/screen. */
  variant?: 'bleed' | 'framed';
  /** CSS object-position for the crop, e.g. "center 30%" */
  position?: string;
  children?: React.ReactNode;
}) {
  const media = (
    <div className="ib-media" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, CSS-tinted background */}
      <img src={src} alt="" loading="lazy" decoding="async" style={{ objectPosition: position }} />
      <span className="ib-tint" />
    </div>
  );
  const content = (
    <div className="ib-content">
      {eyebrow && (
        <p className="mono ib-eyebrow">
          <i aria-hidden="true" /> {eyebrow}
        </p>
      )}
      <h2 className="ib-title">{title}</h2>
      {body && <p className="ib-body">{body}</p>}
      {children}
    </div>
  );

  if (variant === 'framed') {
    return (
      <section className="image-band framed">
        <div className="wrap">
          <div className="ib-frame">
            {media}
            {content}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="image-band bleed">
      {media}
      <div className="wrap ib-wrap">{content}</div>
    </section>
  );
}
