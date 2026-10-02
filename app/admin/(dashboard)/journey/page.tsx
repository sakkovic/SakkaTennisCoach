import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { JourneyManager } from "@/components/admin/JourneyManager";
import { coachToday } from "@/lib/admin/today";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Journey" };

export default async function AdminJourneyPage() {
  const { today } = await coachToday();
  const posts = await getRepository().listJourneyPosts({ includeUnpublished: true });

  return (
    <div className="space-y-2">
      <AdminPageHeader
        title="Journey"
        description="Celebrate wins and share moments. Published posts appear in “Follow the journey” on the homepage and on /journey."
      />
      <JourneyManager posts={posts} today={today} />
    </div>
  );
}
