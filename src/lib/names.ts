// Spotify lists some songs and artists under more than one name ("Sundial" /
// "Sundial - Remastered", "I've" / "I’ve"), so names are matched loosely.

// A letter, number or underscore in any script, like Python's \w. JavaScript's
// \w and \b only know English letters.
const WORD = String.raw`[\p{L}\p{N}_]`;
const wholeWords = (words: string) =>
  String.raw`(?<!${WORD})(?:${words})(?!${WORD})`;

// A tag at the end of a title: "Song - 2011 Remaster", "Song (Radio Edit)",
// "Song [Mono]"
const TAG = /\s*(?:\s-\s([^()[\]-]*)|\(([^()]*)\)|\[([^[\]]*)\])\s*$/u;
// Tags that only relabel the same recording, so they're dropped...
const SAME_RECORDING = new RegExp(
  String.raw`^(?:feat\.?|ft\.|featuring|with)\s|` +
    wholeWords(
      "remaster(?:ed)?|radio edit|single version|album version|" +
        "full length version|single edit|edit|mono|stereo|bonus track",
    ),
  "iu",
);
// ...unless they also name a different recording: "Live - 2011 Remaster",
// "Radio Edit Remix"
const OTHER_RECORDING = new RegExp(
  wholeWords("live|re-?mix|mix|demo|acoustic|unplugged|instrumental|session"),
  "iu",
);
// Featured artists can sit anywhere: "Song (feat. X) [Interlude]"
const FEAT = /\s*[([](?:feat\.?|ft\.|featuring)\s[^()[\]]*[)\]]/giu;

/**
 * The title without tags that only relabel the same recording, so "Paper
 * Lanterns (Radio Edit) [feat. X]" is "Paper Lanterns". Live versions, remixes,
 * demos and acoustic versions are different recordings and keep their tags.
 */
export function songTitle(track: string): string {
  let title = track.replace(FEAT, "");
  for (let match = TAG.exec(title); match; match = TAG.exec(title)) {
    const tag = match[1] ?? match[2] ?? match[3];
    if (!SAME_RECORDING.test(tag) || OTHER_RECORDING.test(tag)) break;
    title = title.slice(0, match.index);
  }
  return title.trim() || track;
}

/**
 * A loose form of a name for matching. It ignores case, accents, punctuation
 * and spaces, so "I've" and "I’ve", "Sun Dial (Nightshift)" and "Sundial -
 * Nightshift" match.
 */
export function matchKey(name: string): string {
  const folded = casefold(name);
  // Decomposing splits accents off letters ("é" becomes "e" and "´"), so
  // keeping only letters and numbers drops accents, punctuation and spaces.
  return folded.normalize("NFKD").replace(/[^\p{L}\p{N}_]/gu, "") || folded;
}

// Python's str.casefold() for the letters where it differs from lower case
// after decomposing: German ß and Greek final sigma.
function casefold(text: string): string {
  return text.toLowerCase().replace(/ß/g, "ss").replace(/ς/g, "σ");
}
