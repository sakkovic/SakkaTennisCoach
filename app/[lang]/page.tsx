import { BookingCTA } from "@/components/home/BookingCTA";
import { Credentials } from "@/components/home/Credentials";
import { FocusAreas } from "@/components/home/FocusAreas";
import { Hero } from "@/components/home/Hero";
import { Intro } from "@/components/home/Intro";
import { JourneySection } from "@/components/home/JourneySection";
import { PlayerLevels } from "@/components/home/PlayerLevels";
import { WhyTrain } from "@/components/home/WhyTrain";
import { coachJsonLd, JsonLd } from "@/lib/seo/jsonld";
import { getI18n } from "@/lib/i18n/server";

// Journey posts come from the database; refreshed on every dashboard edit and every 5 minutes.
export const revalidate = 300;

export default async function HomePage() {
  const { locale, t } = await getI18n();
  return (
    <>
      <JsonLd data={coachJsonLd(t, locale)} />
      <Hero />
      <Intro />
      <FocusAreas />
      <PlayerLevels />
      <Credentials />
      <WhyTrain />
      <BookingCTA />
      <JourneySection />
    </>
  );
}
