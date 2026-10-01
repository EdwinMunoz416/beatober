import { BlurText } from "@/components/ReactBits/BlurText";
import { StudioDazeHeader } from "@/components/StudioDazeHeader";

/** Full-viewport first-visit loader (patterns already in page payload). */
export function BeatoberInitialLoadingScreen() {
  return (
    <div
      className="beatober-initial-load"
      aria-busy="true"
      aria-label="Loading beatober"
    >
      <StudioDazeHeader />
      <p className="beatober-initial-load__label">
        <BlurText
          text="loading"
          animateBy="letters"
          direction="top"
          delay={70}
          stepDuration={0.45}
          className="beatober-initial-load__blur"
        />
      </p>
    </div>
  );
}
