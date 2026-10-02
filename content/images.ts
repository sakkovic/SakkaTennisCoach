/**
 * All site photography in one place.
 * Most are PLACEHOLDER images (Unsplash). To use the coach's own photos:
 *   1. put the files in /public/images (e.g. /public/images/hero.jpg)
 *   2. change `src` below to "/images/hero.jpg"
 *   3. update the `alt` (English) and `altFr` (French) descriptions of the real photo
 */
export type SiteImage = { src: string; alt: string; altFr: string };

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80`;

export const images = {
  hero: {
    src: "/images/sakkaTennishomepage1.jpg",
    alt: "Sami Sakka on a floodlit tennis court with ball machines, targets and training equipment",
    altFr: "Sami Sakka sur un court de tennis éclairé, avec lance-balles, cibles et matériel d'entraînement",
  },
  coachPortrait: {
    src: unsplash("1637071669555-cf9afa251964"),
    alt: "Coach standing on a tennis court holding a racquet",
    altFr: "Coach debout sur un court de tennis, raquette à la main",
  },
  coachingSession: {
    src: unsplash("1634840542403-1a9b1067aaa0"),
    alt: "Coach feeding balls to a player during a private session",
    altFr: "Coach envoyant des balles à un joueur pendant un cours particulier",
  },
  forehand: {
    src: unsplash("1714840961579-6b072a12536e"),
    alt: "Player preparing a forehand on a blue hard court",
    altFr: "Joueur préparant un coup droit sur un court en dur bleu",
  },
  serve: {
    src: unsplash("1715431900724-6bf15144ae0e"),
    alt: "Player serving on an outdoor court",
    altFr: "Joueur au service sur un court extérieur",
  },
  movement: {
    src: unsplash("1714841197541-aa64d90cb6a8"),
    alt: "Player moving wide to strike the ball",
    altFr: "Joueur se déplaçant latéralement pour frapper la balle",
  },
  junior: {
    src: unsplash("1723980856085-8f8e725329a7"),
    alt: "Young player holding a racquet on a clay court",
    altFr: "Jeune joueuse tenant une raquette sur un court en terre battue",
  },
  net: {
    src: unsplash("1699117686612-ece525e4f91a"),
    alt: "Tennis net across a blue court",
    altFr: "Filet de tennis sur un court bleu",
  },
  courtAerial: {
    src: unsplash("1620742820748-87c09249a72a"),
    alt: "Aerial view of a clay tennis court",
    altFr: "Vue aérienne d'un court en terre battue",
  },
  racketBalls: {
    src: unsplash("1632755898125-36cd72575dde"),
    alt: "Racquet and tennis balls on a court",
    altFr: "Raquette et balles de tennis sur un court",
  },
  ballLine: {
    src: unsplash("1541744573515-478c959628a0"),
    alt: "Tennis ball resting near the baseline",
    altFr: "Balle de tennis près de la ligne de fond",
  },
  contact: {
    src: unsplash("1637071692126-d0ee7df18271"),
    alt: "Player reaching high for a serve on a dark court",
    altFr: "Joueur au service sur un court de nuit",
  },
} satisfies Record<string, SiteImage>;

export function imageAlt(image: SiteImage, locale: "en" | "fr"): string {
  return locale === "fr" ? image.altFr : image.alt;
}

// "Follow the journey" photos are posted by the coach from /admin/journey (database).
