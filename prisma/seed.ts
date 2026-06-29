// NASCAR-003 — Track seed data.
//
// Seeds the NASCAR 25 track pool. Idempotent: each track is upserted by its
// unique `name`, so re-running never duplicates rows. Run with `npm run db:seed`
// (wired through prisma.config.ts → migrations.seed).

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, SeriesType } from "../src/generated/prisma/client";

// Per-series availability is best-effort. NASCAR 25 locks tracks to specific
// series, but there's no machine-readable source for that mapping, so per the
// NASCAR-003 technical notes every track defaults to all four series and is
// flagged for a follow-up that narrows them.
const ALL_SERIES: SeriesType[] = [
  SeriesType.ARCA,
  SeriesType.TRUCK,
  SeriesType.XFINITY,
  SeriesType.CUP,
];

type TrackType =
  "superspeedway" | "intermediate" | "short" | "roadCourse" | "dirt";

type TrackSeed = {
  /** Unique, matches the official list (nascar25.com/tracks). Upsert key. */
  name: string;
  shortName: string;
  trackType: TrackType;
  /** Defaults to ALL_SERIES (see note above). */
  series?: SeriesType[];
};

// `trackType` is assigned by a documented best-effort rule (refineable later):
//   - roadCourse:    road / street circuits
//   - superspeedway: ovals >= 2.0 mi, plus the drafting-style ovals
//                    (Daytona, Talladega, Echo Park / old Atlanta)
//   - short:         ovals < 1.0 mi
//   - intermediate:  ovals 1.0–2.0 mi
// No dirt track ships in this pool, so the `dirt` value is currently unused.
const TRACKS: TrackSeed[] = [
  { name: "Bristol", shortName: "Bristol", trackType: "short" },
  {
    name: "Charlotte Motor Speedway",
    shortName: "Charlotte",
    trackType: "intermediate",
  },
  { name: "Charlotte Roval", shortName: "Roval", trackType: "roadCourse" },
  {
    name: "Chicago Street Course",
    shortName: "Chicago",
    trackType: "roadCourse",
  },
  {
    name: "Circuit of The Americas",
    shortName: "COTA",
    trackType: "roadCourse",
  },
  { name: "Darlington", shortName: "Darlington", trackType: "intermediate" },
  { name: "Daytona", shortName: "Daytona", trackType: "superspeedway" },
  { name: "Dover", shortName: "Dover", trackType: "intermediate" },
  {
    name: "Echo Park Speedway",
    shortName: "Echo Park",
    trackType: "superspeedway",
  },
  { name: "Homestead", shortName: "Homestead", trackType: "intermediate" },
  { name: "Indianapolis", shortName: "Indy", trackType: "superspeedway" },
  { name: "Iowa", shortName: "Iowa", trackType: "short" },
  { name: "Kansas", shortName: "Kansas", trackType: "intermediate" },
  { name: "Las Vegas", shortName: "Vegas", trackType: "intermediate" },
  { name: "Lime Rock", shortName: "Lime Rock", trackType: "roadCourse" },
  {
    name: "Indianapolis Raceway Park",
    shortName: "IRP",
    trackType: "short",
  },
  { name: "Martinsville", shortName: "Martinsville", trackType: "short" },
  { name: "Michigan", shortName: "Michigan", trackType: "intermediate" },
  { name: "Nashville", shortName: "Nashville", trackType: "intermediate" },
  {
    name: "New Hampshire",
    shortName: "New Hampshire",
    trackType: "intermediate",
  },
  {
    name: "North Wilkesboro",
    shortName: "Wilkesboro",
    trackType: "short",
  },
  { name: "Phoenix", shortName: "Phoenix", trackType: "intermediate" },
  { name: "Pocono", shortName: "Pocono", trackType: "superspeedway" },
  { name: "Portland", shortName: "Portland", trackType: "roadCourse" },
  { name: "Richmond", shortName: "Richmond", trackType: "short" },
  { name: "Rockingham", shortName: "Rockingham", trackType: "intermediate" },
  { name: "Sonoma", shortName: "Sonoma", trackType: "roadCourse" },
  { name: "Talladega", shortName: "Talladega", trackType: "superspeedway" },
  { name: "Texas", shortName: "Texas", trackType: "intermediate" },
  { name: "Watkins Glen", shortName: "Watkins Glen", trackType: "roadCourse" },
  {
    name: "Worldwide Technology Raceway",
    shortName: "Gateway",
    trackType: "intermediate",
  },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const track of TRACKS) {
    const data = {
      shortName: track.shortName,
      series: track.series ?? ALL_SERIES,
      trackType: track.trackType,
      active: true,
    };

    await prisma.track.upsert({
      where: { name: track.name },
      create: { name: track.name, ...data },
      update: data,
    });
  }

  const count = await prisma.track.count();
  console.log(`Seeded tracks: ${TRACKS.length} defined, ${count} in DB.`);

  // Smoke check: every defined track must be present after seeding.
  if (count < TRACKS.length) {
    throw new Error(
      `Expected at least ${TRACKS.length} tracks, found ${count}.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
