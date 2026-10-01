import { StudioDazeHeader } from "@/components/StudioDazeHeader";

/** Route-level fallback while BeatoberShell loads manifest + day pattern. */
export function BeatoberPageSkeleton() {
  return (
    <div className="beatober-page" aria-busy="true" aria-label="Loading beatober">
      <div className="beatober-workspace">
        <StudioDazeHeader />
        <div className="beatober-skeleton-wheel" aria-hidden />
        <div className="beatober-main">
          <div className="beatober-skeleton-panel">
            <div className="beatober-skeleton-bar beatober-skeleton-bar--wide" />
            <div className="beatober-skeleton-bar" />
            <div className="beatober-skeleton-bar" />
            <div className="beatober-skeleton-bar beatober-skeleton-bar--short" />
          </div>
        </div>
      </div>
    </div>
  );
}
