# FRXCX Studio — Media Management & Replacement Guide

Welcome to the **FRXCX Studio Media Guide**. This document explains how anyone—including non-developers and designers—can easily update, replace, or optimize video and image assets across the website with zero risk of breaking animations or styling.

---

## 1. Quick Start: Swapping Any Video or Image in 1 Step

You can view all media slots currently configured on the website:

```bash
npm run media:list
```

To replace any video or poster image, run:

```bash
npm run media:replace <slotId> <path/to/your-new-file.mp4>
```

**Example:**
```bash
npm run media:replace work-2 ./new-bali-drone-reel.mp4
```

> **Automated Safety:** When you run `npm run media:replace`, the system automatically creates a timestamped backup of your previous file in `public/assets/backups/`. You can revert at any moment!

---

## 2. Media Slots Reference Table

| Slot ID | Section | Type | Aspect Ratio | Recommended Resolution | File Location |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `hero-card-1` | Hero Title Cards | Video | 16:9 Horizontal | 1280 × 720 | `public/assets/videos/card-1.mp4` |
| `hero-card-2` | Hero Title Cards | Video | 9:16 Vertical | 720 × 1280 | `public/assets/videos/card-2.mp4` |
| `hero-card-3` | Hero Title Cards | Video | 16:9 Horizontal | 1280 × 720 | `public/assets/videos/card-3.mp4` |
| `hero-card-4` | Hero Title Cards | Video | 9:16 Vertical | 720 × 1280 | `public/assets/videos/card-4.mp4` |
| `work-1` | 3D Carousel (Card 1) | Video | 9:16 Vertical | 1080 × 1920 | `public/assets/videos/works/work-1.mp4` |
| `work-2` | 3D Carousel (Card 2) | Video | 9:16 Vertical | 1080 × 1920 | `public/assets/videos/works/work-2.mp4` |
| `work-3` | 3D Carousel (Card 3) | Video | 9:16 Vertical | 1080 × 1920 | `public/assets/videos/works/work-3.mp4` |
| `work-4` | 3D Carousel (Card 4) | Video | 9:16 Vertical | 1080 × 1920 | `public/assets/videos/works/work-4.mp4` |
| `work-5` | 3D Carousel (Card 5) | Video | 9:16 Vertical | 1080 × 1920 | `public/assets/videos/works/work-5.mp4` |
| `faq-reel-1` | FAQ Showcase Card 1 | Video | 9:16 Vertical | 720 × 1280 | `public/assets/videos/works/work-1.mp4` |
| `faq-reel-2` | FAQ Showcase Center | Video | 9:16 Vertical | 720 × 1280 | `public/assets/videos/works/work-2.mp4` |
| `faq-reel-3` | FAQ Showcase Card 3 | Video | 9:16 Vertical | 720 × 1280 | `public/assets/videos/works/work-3.mp4` |

---

## 3. Video Optimization Standards (Ensuring 60–120 FPS Performance)

To guarantee that videos load instantly and play at silky-smooth 60–120 FPS on all devices (mobile, tablet, and 4K displays):

1. **Codec**: `H.264` (High Profile) or `VP9/AV1` for maximum web compatibility.
2. **Audio**: Muted / audio track stripped (FRXCX studio cards are silent background looping reels). Stripping audio cuts file sizes by ~30%.
3. **Framerate**: 24 fps, 30 fps, or 60 fps constant framerate (CFR).
4. **Target Bitrate**:
   - Vertical (9:16) Reels: 1,500 – 2,500 kbps (keeps files under 4 MB for 8–15 second loops).
   - Horizontal (16:9) Hero Cards: 1,800 – 3,000 kbps (keeps files under 3 MB for 4–6 second loops).
5. **Quick FFmpeg Command for Perfect Web Optimization**:
   ```bash
   ffmpeg -i input.mov -vcodec libx264 -crf 22 -preset slow -an -movflags +faststart output.mp4
   ```
   *(The `+faststart` flag places the MOOV atom at the start of the file so videos start playing immediately without waiting for the full download!)*

---

## 4. Multi-Layer Enterprise Media Protection

Your website incorporates multi-tier enterprise protection so visitors and competitors cannot easily copy or download your videos and graphics:

1. **Ephemeral Signed Tokens**: Media requests are signed via HMAC-SHA256 tokens (`/api/media/[token]`) that expire in 10 minutes. Permanent raw video links are never exposed.
2. **Blob Streaming**: Media is delivered as in-memory `blob:http://...` streams. Inspecting the DOM will not reveal the source video URL.
3. **Hotlink & Referer Shield**: Direct requests from unauthorized third-party domains return `403 Forbidden`.
4. **Context & Drag Blocking**: Right-click context menu and drag-to-desktop gestures on media elements are blocked via transparent overlays and event cancellation.
5. **Native Download Removal**: Controls list contains `nodownload noremoteplayback` and `disablePictureInPicture`.
6. **Visibility Pause**: Off-screen video playback is automatically suspended via `IntersectionObserver` to save mobile battery and memory, resuming instantly as soon as the card scrolls into view.

---

## 5. Need Help?
- To audit files and statuses: `npm run media:list`
- To check help instructions: `npm run media:help`
- To test the production build: `npm run build`
