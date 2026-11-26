import type { CatalogEntry } from "../rules/sections";

const titleOf = (title: string) => title.split(" | ")[0] ?? title;
const minutesOf = (intro: string) => /(\d+) min of video/.exec(intro)?.[1];
const shorten = (text: string, words: number) => {
  const all = text.split(/\s+/);
  return all.length > words ? `${all.slice(0, words).join(" ")}...` : text;
};

// The real video courses from the indexed site: title, length and the opening of each page.
export function CourseGrid({ courses }: { courses: CatalogEntry[] }) {
  return (
    <ul className="course-grid">
      {courses.map((course) => {
        const minutes = minutesOf(course.intro);
        return (
          <li key={course.url} className="course">
            <h2>
              <a href={course.url} target="_blank" rel="noreferrer">
                {titleOf(course.title)}
              </a>
            </h2>
            <p>{shorten(course.blurb, 34)}</p>
            <p className="course-meta">
              <span className="course-tag">Pro</span>
              <span>First lesson free</span>
              {minutes ? <span>{minutes} min of video</span> : null}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
