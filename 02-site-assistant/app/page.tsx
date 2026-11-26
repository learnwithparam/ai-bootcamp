import { CourseGrid } from "../components/CourseGrid";
import { Messenger } from "../components/Messenger";
import { SiteHeader } from "../components/SiteHeader";
import { catalog } from "../db/queries";
import { canSeeSupport, maybeUser } from "./session";

export const dynamic = "force-dynamic";

// The courses page of learnwithparam.com, built from the pages the assistant answers from.
// The messenger in the corner works for guests; signed in, it can also read your plan and open billing.
export default async function CoursesPage() {
  const user = await maybeUser();
  const courses = await catalog("https://www.learnwithparam.com/courses/");
  return (
    <div className="site">
      <SiteHeader userName={user?.name ?? null} onTeam={await canSeeSupport(user?.id)} />
      <main className="site-main">
        <section className="site-hero">
          <h1>Video courses on building AI agents</h1>
          <p>
            Each course builds one working system you can run at work. The first lesson of every course is
            free; the rest come with Pro.
          </p>
        </section>
        <CourseGrid courses={courses} />
      </main>
      <Messenger />
    </div>
  );
}
