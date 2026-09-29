import { AddFiles } from "../components/AddFiles.tsx";
import { Card } from "../components/Card.tsx";
import type { Exports } from "../components/exports.ts";
import "../styles/welcome.css";

type WelcomeProps = Pick<Exports, "reading" | "notice"> & {
  onAdd: Exports["add"];
};

/** What the app shows before any data is added. */
export function Welcome({ onAdd, reading, notice }: WelcomeProps) {
  return (
    <>
      <h1>Stats from your Spotify listening history</h1>
      <p className="lede">
        Add your Spotify data export to see what you've been listening to. It
        never leaves this device.
      </p>
      <section className="drop-zone" aria-labelledby="drop-zone-title">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12M7 10l5 5 5-5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <h2 id="drop-zone-title">Drop your Spotify data here</h2>
        <p>
          The .zip Spotify sends you, the folder it unzips to, or the
          StreamingHistory_music files inside. Add several exports to go back
          further than a year.
        </p>
        <AddFiles onAdd={onAdd} reading={reading} notice={notice} />
      </section>
      <div className="welcome-cards">
        <Card title="Get your data">
          <ol>
            <li>
              On Spotify's{" "}
              <a href="https://www.spotify.com/account/privacy/">
                Privacy settings
              </a>{" "}
              page, request your <strong>Account data</strong>.
            </li>
            <li>
              Spotify emails you a download link when it's ready, usually within
              a few days.
            </li>
            <li>Download the .zip and drop it here. No need to unzip it.</li>
          </ol>
          <p>
            Each export only covers about the last year, so keep old ones and
            add them too. They're merged into one history.
          </p>
        </Card>
        <Card title="Your data stays here">
          <p>
            Statify runs entirely in your browser. Nothing is uploaded: your
            files are read on this device and kept in this browser, so they're
            still here next time.
          </p>
          <p>
            Only the streaming history is read, not the rest of the export, like
            payment details or searches. You can remove it at any time.
          </p>
        </Card>
      </div>
    </>
  );
}
