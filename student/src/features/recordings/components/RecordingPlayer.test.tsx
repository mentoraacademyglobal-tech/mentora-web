import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import RecordingPlayer from "./RecordingPlayer";
import ChapterBar from "./ChapterBar";

describe("recording player (server render)", () => {
  it("renders the player shell with chapters, watermark and seek bar", () => {
    const html = renderToString(
      <RecordingPlayer
        recordingId="11111111-1111-1111-1111-111111111111"
        title="Binary and denary"
        chapters={[
          { start: 0, title: "Introduction" },
          { start: 252, title: "Binary to denary" },
        ]}
        durationHint={2885}
        watermark="Student (ab12cd34)"
      />,
    );
    expect(html).toContain("Getting the lesson ready");
    expect(html).toContain("Introduction");
    expect(html).toContain("Binary to denary");
    expect(html).toContain("Student (ab12cd34)");
    expect(html).toContain('aria-label="Seek"');
    expect(html).toContain("48:05");
  });

  it("sizes each progress segment by the length of its chapter", () => {
    const html = renderToString(
      <ChapterBar
        duration={1000}
        currentTime={250}
        chapters={[
          { start: 0, title: "A" },
          { start: 100, title: "B" },
        ]}
        onSeek={() => {}}
      />,
    );
    expect(html).toContain("flex-grow:100");
    expect(html).toContain("flex-grow:900");
    expect(html).toContain("aria-valuetext");
  });

  it("shows a single segment when a lesson has no chapters", () => {
    const html = renderToString(<ChapterBar duration={600} currentTime={0} chapters={[]} onSeek={() => {}} />);
    expect(html.match(/flex-grow/g)).toHaveLength(1);
  });
});
