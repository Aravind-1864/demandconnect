// Curated photography (Unsplash). IDs were checked to load and to show what they are named for.
const u = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMG = {
  heroMain: u("1583939003579-730e3918a45a", 1400),
  heroFood: u("1555244162-803834f70033", 900),
  heroDecor: u("1464366400600-7168b8af9bc3", 900),
  heroMakeup: u("1487412947147-5cebf100ffc2", 900),
  cta: u("1519225421980-715cb0215aed", 1800),
  auth: u("1469371670807-013ccf25f16a", 1200),
  manual: u("1511795409834-ef04bbd61622", 1000),
  ai: u("1492684223066-81342ee5ff30", 1000),
  browse: u("1519167758481-83f550bb49b3", 1800),
  describe: u("1530103862676-de8c9debad1d", 1000),
};

export const CATEGORY_IMAGES = {
  photography: u("1452587925148-ce544e77e70d"),
  catering: u("1555244162-803834f70033"),
  decoration: u("1464366400600-7168b8af9bc3"),
  makeup: u("1487412947147-5cebf100ffc2"),
  dj: u("1516450360452-9312f5e86fc7"),
  florist: u("1529636798458-92182e662485"),
};

export const FALLBACK_COVER = u("1511578314322-379afb476865");

/** Best available photo for a provider: own cover → first portfolio → first category → generic. */
export function providerCover(p) {
  return (
    p?.coverImage ||
    p?.portfolio?.[0] ||
    p?.categories?.map((c) => c.image || CATEGORY_IMAGES[c.slug]).find(Boolean) ||
    FALLBACK_COVER
  );
}

export const categoryImage = (c) => c?.image || CATEGORY_IMAGES[c?.slug] || FALLBACK_COVER;

/** Smaller rendition for thumbnails. */
export const sized = (url, w) => (url?.includes("images.unsplash.com") ? url.replace(/w=\d+/, `w=${w}`) : url);
