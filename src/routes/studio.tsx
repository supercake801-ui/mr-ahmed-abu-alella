import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageTitle } from "@/components/site-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoursesPanel } from "@/components/studio/courses-panel";
import { VideosPanel } from "@/components/studio/videos-panel";
import { TeacherPanel } from "@/components/studio/teacher-panel";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "استوديو المدرس | أسد التاريخ" },
      { name: "description", content: "إدارة المقررات والفيديوهات وصفحة المدرس على منصة أسد التاريخ." },
      { property: "og:title", content: "استوديو المدرس | أسد التاريخ" },
      { property: "og:description", content: "إدارة المقررات والفيديوهات وصفحة المدرس." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth need="staff">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageTitle title="استوديو المدرس" subtitle="المقررات والفيديوهات وصفحة المدرس" />
        <Tabs defaultValue="videos" dir="rtl">
          <TabsList className="mb-6">
            <TabsTrigger value="videos">الفيديوهات</TabsTrigger>
            <TabsTrigger value="courses">المقررات</TabsTrigger>
            <TabsTrigger value="teacher">صفحة المدرس</TabsTrigger>
          </TabsList>
          <TabsContent value="videos"><VideosPanel /></TabsContent>
          <TabsContent value="courses"><CoursesPanel /></TabsContent>
          <TabsContent value="teacher"><TeacherPanel /></TabsContent>
        </Tabs>
      </div>
    </RequireAuth>
  ),
});
