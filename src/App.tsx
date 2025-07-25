
import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';


const App = () => {
  type SRTEntry = {
    id: number;
    start: string;
    end: string;
    text: string;
    startSeconds: number;
    endSeconds: number;
  };

  const parseSRT = (srt: string): SRTEntry[] => {
    return srt
      .trim()
      .split(/\r?\n\r?\n/)
      .map((block) => {
        const lines = block.split(/\r?\n/);
        const id = parseInt(lines[0]);
        if (!lines[1] || !lines[1].includes(" --> ")) return null;

        const [start, end] = lines[1].split(" --> ");
        const text = lines.slice(2).join("\n");

        if (!start || !end) return null;

        return {
          id,
          start,
          end,
          text,
          startSeconds: timeToSeconds(start),
          endSeconds: timeToSeconds(end),
        };
      })
      .filter((entry): entry is SRTEntry => entry !== null && !isNaN(entry.id));
  };

  const timeToSeconds = (time: string): number => {
    if (!time || !time.includes(":") || !time.includes(",")) return 0;
    const [h, m, sMs] = time.split(":");
    const [s, ms] = sMs.split(",");
    return (
      parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000
    );
  };

  const formatSubtitleText = (text: string): string => {
    const lines = text.split("\n");
    return lines
      .map((line, index) => {
        if (index > 0 && line.trim().startsWith("- ")) {
          return "<br />" + line;
        }
        return line;
      })
      .join("<br />");
  };

  const [srtText, setSrtText] = useState<SRTEntry[]>([]);

  const [currentText, setCurrentText] = useState<number | undefined>(undefined);

  const [marginBottomSubtitle, setMarginBottomSubtitle] = useState<number>(70);

  const [showPrevNext, setShowPrevNext] = useState<boolean>(false);

  const [manualMode, setManualMode] = useState<boolean>(false);

  const [showClock, setShowClock] = useState<boolean>(false);

  const [playbackTime, setPlaybackTime] = useState(0);

  const manualModeRef = useRef(manualMode);
  const currentTextRef = useRef(currentText);
  const srtTextRef = useRef(srtText);

  useEffect(() => {
    if (manualMode) {
      setCurrentText(srtText[0].id);
    }
    manualModeRef.current = manualMode;
  }, [manualMode]);
  useEffect(() => {
    currentTextRef.current = currentText;
  }, [currentText]);
  useEffect(() => {
    srtTextRef.current = srtText;
  }, [srtText]);

  const pressSpace = () => {
    if (manualModeRef.current) {
      if (
        currentTextRef.current !== undefined &&
        srtTextRef.current.length > 0
      ) {
        const currentIndex = srtTextRef.current.findIndex(
          (entry) => entry.id === currentTextRef.current
        );
        if (currentIndex >= 0 && currentIndex < srtTextRef.current.length - 1) {
          setCurrentText(srtTextRef.current[currentIndex + 1].id);
        } else {
          setCurrentText(srtTextRef.current[0].id);
        }
      }
    } else {
      if (srtTextRef.current.length > 0) {
        setCurrentText(srtTextRef.current[0].id);
      }
    }
  };

  useEffect(() => {
    if (srtText.length > 0 && currentText === undefined) {
      setCurrentText(-1);
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen();
      } else if ((document.documentElement as any).msRequestFullscreen) {
        (document.documentElement as any).msRequestFullscreen();
      }
    }
  }, [srtText]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const entries = parseSRT(text);
      setSrtText(entries);
    };
    reader.readAsText(file, "windows-1252");
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        intervalId = setInterval(() => {
          setMarginBottomSubtitle((prev) =>
            e.key === "ArrowUp" ? prev + 1 : Math.max(0, prev - 1)
          );
        }, 50);
        setMarginBottomSubtitle((prev) =>
          e.key === "ArrowUp" ? prev + 1 : Math.max(0, prev - 1)
        );
      }
      if (e.key.toLowerCase() === "b") {
        setShowPrevNext((prev) => !prev);
      }
      if (e.key.toLowerCase() === "m") {
        setManualMode((prev) => !prev);
      }
      if (e.key === " ") {
        e.preventDefault();
        pressSpace();
      }
      if (e.key.toLowerCase() === "c") {
        setShowClock((prev) => !prev);
      }
      if (e.key === "ArrowRight") {
        setPlaybackTime((t) => t + 1); // Skip forward 1 second
      }
      if (e.key === "ArrowLeft") {
        setPlaybackTime((t) => Math.max(0, t - 1)); // Skip backward 1 second
      }
      if (e.key.toLowerCase() === "a") {
        setPlaybackTime((t) => Math.max(0, t - 0.1)); // Rewind 0.1 seconds
      }
      if (e.key.toLowerCase() === "d") {
        setPlaybackTime((t) => t + 0.1); // Advance 0.1 seconds
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!manualMode && srtText.length > 0) {
      const interval = setInterval(() => {
        setPlaybackTime((prev) => prev + 0.1);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [manualMode, srtText]);

  useEffect(() => {
    if (!manualMode && srtText.length > 0) {
      const currentEntry = srtText.find(
        (entry) =>
          playbackTime >= entry.startSeconds && playbackTime <= entry.endSeconds
      );
      if (currentEntry && currentText !== currentEntry.id) {
        setCurrentText(currentEntry.id);
      } else if (!currentEntry && currentText !== -1) {
        setCurrentText(-1);
      }
    }
  }, [playbackTime, srtText, currentText, manualMode]);

  return (
    <ContainerWeb>
      {!currentText ? (
        <>
          <h1>Welcome to Allegras Subtitles!</h1>
          <ul>
            <li>Use the up and down arrow keys to position the subtitles.</li>
            <li>Press 'C' to show clock</li>
            <li>
              Press right and left arrow keys to advance or rewind subtitles 1
              second.
            </li>
            <li>Press 'A' to rewind subtitles one tenth of a second.</li>
            <li>Press 'D' to advance subtitles one tenth of a second.</li>
            <li>
              Press 'M' to toggle manual mode. Manual mode will trigger down all
              timing functionality, use it carefully.
            </li>
            <li>
              In manual mode, press 'B' to toggle the previous/next buttons.
            </li>
            <li>In manual mode, press 'Space' to go to the next subtitle.</li>
          </ul>
          <h2>Update a subtitle file to start</h2>
          {/* Hidden file input – accept restricts to .srt */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <ButtonUpload onClick={handleButtonClick}>
            Open Subtitle File
          </ButtonUpload>
        </>
      ) : (
        <>
          {showPrevNext && manualMode && (
            <ButtonsContainer>
              <button
                onClick={() => {
                  if (
                    srtText.findIndex((entry) => entry.id === currentText) > 0
                  ) {
                    setCurrentText(
                      srtText.at(
                        srtText.findIndex((entry) => entry.id === currentText) -
                          1
                      )?.id
                    );
                  }
                }}
                disabled={currentText <= 0}
              >
                Previous
              </button>
              <button
                onClick={() => {
                  if (
                    srtText.findIndex((entry) => entry.id === currentText) <
                    srtText.length - 1
                  ) {
                    setCurrentText(
                      srtText.at(
                        srtText.findIndex((entry) => entry.id === currentText) +
                          1
                      )?.id
                    );
                  }
                }}
                disabled={currentText >= srtText.length - 1}
              >
                Next
              </button>
            </ButtonsContainer>
          )}
          {showClock && <h2>{playbackTime.toFixed(2)}</h2>}
          <SubtitleText marginBottom={marginBottomSubtitle}>
            <div
              dangerouslySetInnerHTML={{
                __html: formatSubtitleText(
                  srtText.find((entry) => entry.id === currentText)?.text ?? ""
                ),
              }}
            />
          </SubtitleText>
        </>
      )}
    </ContainerWeb>
  );
};

export default App;

const ContainerWeb = styled.div`
  display: flex;
  width: 100%;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #000;
  h1,
  h2,
  p,
  pre,
  li {
    font-family: Arial, Helvetica, sans-serif;
    color: #fff;
  }
`;

const ButtonUpload = styled.button`
  cursor: pointer;
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
  button {
    cursor: pointer;
  }
`;

interface SubtitleTextProps {
  marginBottom: number;
}

const SubtitleText = styled.h1<SubtitleTextProps>`
  margin-top: auto;
  margin-bottom: ${({ marginBottom }) => marginBottom}px;
  text-align: center;
`;