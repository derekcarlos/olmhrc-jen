import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { massParts } from "./lib/mass-parts";
import { youtubeVideoId } from "./lib/youtube.mjs";

const commonFields = {
  title: z.string(),
  description: z.string(),
  meta_title: z.string().optional(),
  // z.coerce.date() handles both Date objects and ISO string dates from frontmatter (Zod 4)
  date: z.coerce.date().optional(),
  image: z.string().optional(),
  draft: z.boolean(),
};

// Post collection schema
const blogCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "src/content/blog" }),
  schema: z.object({
    title: z.string(),
    meta_title: z.string().optional(),
    description: z.string().optional(),
    date: z.coerce.date().optional(),
    image: z.string().optional(),
    author: z.string().default("Admin"),
    // Use factory functions for mutable array defaults (Zod 4 best practice)
    categories: z.array(z.string()).default(() => ["others"]),
    tags: z.array(z.string()).default(() => ["others"]),
    draft: z.boolean().optional(),
  }),
});

// Chapel news is separate from the starter template's demo blog.
const newsCollection = defineCollection({
  loader: glob({ pattern: "*.{md,mdx}", base: "src/content/news" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    meta_title: z.string().optional(),
    date: z.coerce.date(),
    image: z.string().optional(),
    author: z.string().default("Our Lady of the Most Holy Rosary Chapel"),
    categories: z.array(z.string()).default(() => []),
    draft: z.boolean().default(true),
  }),
});

// Author collection schema
const authorsCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "src/content/authors" }),
  schema: z.object({
    ...commonFields,
    social: z
      .array(
        z
          .object({
            name: z.string().optional(),
            icon: z.string().optional(),
            link: z.string().optional(),
          })
          .optional(),
      )
      .optional(),
    draft: z.boolean().optional(),
  }),
});

// Pages collection schema
const pagesCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "src/content/pages" }),
  schema: z.object({
    ...commonFields,
    wide: z.boolean().default(false),
    compact_header: z.boolean().default(false),
  }),
});

// Prayer and devotion pages linked from the Prayers hub.
const prayersCollection = defineCollection({
  loader: glob({ pattern: "*.{md,mdx}", base: "src/content/prayers" }),
  schema: z.object({
    ...commonFields,
    language: z.enum(["en", "tl"]).default("en"),
  }),
});

// Song lyrics and practice recordings, reused by dated choir selections.
const songsCollection = defineCollection({
  loader: glob({ pattern: "*.{md,mdx}", base: "src/content/songs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    composer: z.string().default(""),
    arranger: z.string().default(""),
    language: z.string().default(""),
    mass_parts: z
      .array(
        z
          .string()
          .refine(
            (id) => massParts.some((part) => part.id === id),
            "Unknown Mass part",
          ),
      )
      .default(() => []),
    marian: z.boolean().default(false),
    seasons: z.array(z.string()).default(() => []),
    occasions: z.array(z.string()).default(() => []),
    audio: z
      .string()
      .refine(
        (src) => !src || /^\/(?!\/)/.test(src) || /^https:\/\//.test(src),
        "Use a local audio path or HTTPS URL",
      )
      .default(""),
    audio_credit: z.string().default(""),
    youtube: z
      .string()
      .trim()
      .refine(
        (url) => !url || youtubeVideoId(url) !== null,
        "Use a YouTube video URL (watch, share, Shorts, live or embed link)",
      )
      .default(""),
    placeholder: z.boolean().default(false),
    draft: z.boolean().default(true),
  }),
});

const eventMonthDay = z
  .string()
  .regex(/^\d{2}-\d{2}$/)
  .refine(
    (value) => z.iso.date().safeParse(`2000-${value}`).success,
    "Use a valid MM-DD date",
  );

const eventsCollection = defineCollection({
  loader: glob({ pattern: "*.md", base: "src/content/events" }),
  schema: z
    .object({
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
      location: z.string().default("Our Lady of the Most Holy Rosary Chapel"),
      all_day: z.boolean().default(false),
      replaces_liturgical_id: z.string().regex(/^[a-z0-9_]+$/).optional(),
      time: z
        .union([z.literal(""), z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)])
        .default(""),
      date: z.union([z.literal(""), z.iso.date()]).default(""),
      end_date: z.union([z.literal(""), z.iso.date()]).default(""),
      repeat: z.enum(["none", "weekly", "yearly"]).default("none"),
      weekday: z.number().int().min(0).max(6).optional(),
      excluded_dates: z.array(z.iso.date()).default(() => []),
      category: z
        .enum([
          "general",
          "mass",
          "novena",
          "feast",
          "solemnity",
          "memorial",
          "advent",
          "christmas",
          "lent",
          "holy-week",
          "easter",
        ])
        .default("general"),
      excluded_annual_ranges: z
        .array(z.object({ start: eventMonthDay, end: eventMonthDay }))
        .default(() => []),
      draft: z.boolean().default(true),
    })
    .superRefine((event, ctx) => {
      if (event.repeat === "weekly") {
        if (event.weekday === undefined)
          ctx.addIssue({
            code: "custom",
            path: ["weekday"],
            message: "Weekly events need a weekday (0 = Sunday, 6 = Saturday)",
          });
        if (event.date || event.end_date)
          ctx.addIssue({
            code: "custom",
            path: ["date"],
            message: "Weekly events use weekday; leave date and end_date blank",
          });
      } else {
        if (!event.date)
          ctx.addIssue({
            code: "custom",
            path: ["date"],
            message: "Dated events need a start date",
          });
        if (event.weekday !== undefined)
          ctx.addIssue({
            code: "custom",
            path: ["weekday"],
            message: "Only weekly events use weekday",
          });
        if (
          event.repeat === "none" &&
          event.end_date &&
          event.end_date < event.date
        )
          ctx.addIssue({
            code: "custom",
            path: ["end_date"],
            message: "End date cannot precede start date",
          });
      }
    }),
});

// about collection schema
const aboutCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "src/content/about" }),
  schema: z.object({
    ...commonFields,
  }),
});

// Homepage collection schema
const homepageButton = z.object({ label: z.string(), link: z.string() });
const homepageSection = z.object({
  title: z.string(),
  content: z.string(),
  button: homepageButton,
});
const homepageCollection = defineCollection({
  loader: glob({ pattern: "**/-*.{md,mdx}", base: "src/content/homepage" }),
  schema: z.object({
    banner: homepageSection.extend({
      chapel: z.string(),
      location: z.string(),
      image: z.string(),
      image_alt: z.string(),
      secondary_button: homepageButton,
    }),
    mass: homepageSection.extend({ detail: z.string(), notice: z.string() }),
    news: homepageSection.extend({ notice: z.string() }),
    prayer: z.object({
      title: z.string(),
      content: z.string(),
      resources: z.array(
        z.object({
          title: z.string(),
          content: z.string(),
          label: z.string(),
          link: z.string(),
        }),
      ),
    }),
    community: homepageSection.extend({ detail: z.string() }),
  }),
});

// Call to Action collection schema
const ctaSectionCollection = defineCollection({
  loader: glob({
    pattern: "call-to-action.{md,mdx}",
    base: "src/content/sections",
  }),
  schema: z.object({
    enable: z.boolean(),
    title: z.string(),
    description: z.string(),
    image: z.string(),
    button: z.object({
      enable: z.boolean(),
      label: z.string(),
      link: z.string(),
    }),
  }),
});

// Testimonials Section collection schema
const testimonialSectionCollection = defineCollection({
  loader: glob({
    pattern: "testimonial.{md,mdx}",
    base: "src/content/sections",
  }),
  schema: z.object({
    enable: z.boolean(),
    title: z.string(),
    description: z.string(),
    testimonials: z.array(
      z.object({
        name: z.string(),
        avatar: z.string(),
        designation: z.string(),
        content: z.string(),
      }),
    ),
  }),
});

// Export collections
export const collections = {
  // Pages
  homepage: homepageCollection,
  blog: blogCollection,
  news: newsCollection,
  prayers: prayersCollection,
  songs: songsCollection,
  events: eventsCollection,
  authors: authorsCollection,
  pages: pagesCollection,
  about: aboutCollection,

  // sections
  ctaSection: ctaSectionCollection,
  testimonialSection: testimonialSectionCollection,
};
