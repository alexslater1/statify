import { describe, expect, it } from "vitest";
import { matchKey, songTitle } from "./names.ts";

describe("songTitle", () => {
  it.each([
    "Paper Lanterns - Remastered",
    "Paper Lanterns - 2011 Remaster",
    "Paper Lanterns - Remastered 2011",
    "Paper Lanterns (Radio Edit)",
    "Paper Lanterns [Mono]",
    "Paper Lanterns - Stereo",
    "Paper Lanterns - Single Version",
    "Paper Lanterns (Album Version)",
    "Paper Lanterns - Full Length Version",
    "Paper Lanterns (Single Edit)",
    "Paper Lanterns - Edit",
    "Paper Lanterns - Bonus Track",
    "Paper Lanterns (with Jo Example)",
    "Paper Lanterns (feat. Jo Example)",
    "Paper Lanterns [ft. Jo Example]",
    "Paper Lanterns (featuring Jo Example)",
    "PAPER LANTERNS - REMASTERED",
  ])("drops the tag from %s", (track) => {
    expect(songTitle(track)).toBe(
      track.startsWith("PAPER") ? "PAPER LANTERNS" : "Paper Lanterns",
    );
  });

  it("drops several tags in turn", () => {
    expect(songTitle("Paper Lanterns - Remastered (Mono)")).toBe(
      "Paper Lanterns",
    );
    expect(songTitle("Paper Lanterns (feat. Jo Example) - Radio Edit")).toBe(
      "Paper Lanterns",
    );
  });

  it.each([
    "Paper Lanterns - Live",
    "Paper Lanterns - Live at the Example Hall",
    "Paper Lanterns (Live - 2011 Remaster)",
    "Paper Lanterns - Radio Edit Remix",
    "Paper Lanterns (Extended Mix)",
    "Paper Lanterns (Re-Mix)",
    "Paper Lanterns (Demo)",
    "Paper Lanterns (Acoustic)",
    "Paper Lanterns [Unplugged]",
    "Paper Lanterns (Instrumental)",
    "Paper Lanterns - Example Session Edit",
  ])("keeps the tag on a different recording: %s", (track) => {
    expect(songTitle(track)).toBe(track);
  });

  it.each([
    "Paper Lanterns - from The Example Studio",
    "Paper Lanterns - EP Version",
    "Paper Lanterns (Interlude)",
    "Paper Lanterns (Credits)",
    "Paper Lanterns (Monotone)",
    "Paper Lanterns (Monoé)",
  ])("keeps a tag that isn't a relabel: %s", (track) => {
    expect(songTitle(track)).toBe(track);
  });

  it("stops at the first tag it keeps", () => {
    expect(songTitle("Paper Lanterns - Live - 2011 Remaster")).toBe(
      "Paper Lanterns - Live",
    );
  });

  it("removes featured artists from anywhere in the title", () => {
    expect(songTitle("Paper Lanterns (feat. Jo Example) [Interlude]")).toBe(
      "Paper Lanterns [Interlude]",
    );
    expect(songTitle("Paper Lanterns (feat. Jo) [ft. Al] [Interlude]")).toBe(
      "Paper Lanterns [Interlude]",
    );
  });

  it("keeps the whole title if nothing would be left", () => {
    expect(songTitle("(Remastered)")).toBe("(Remastered)");
  });
});

describe("matchKey", () => {
  it("keeps only letters and numbers, in lower case", () => {
    expect(matchKey("Café Noir: Part II")).toBe("cafenoirpartii");
  });

  it.each([
    ["I've Been Waiting", "I’ve been waiting"],
    ["Sun Dial (Nightshift)", "Sun Dial - Nightshift"],
    ["Sun Dial", "Sundial"],
    ["Café Noir", "CAFE NOIR"],
    ["Straße", "STRASSE"],
    ["ΛΟΓΟΣ", "λογος"],
    ["λογος", "λογοσ"],
    ["ＡＢＣ", "abc"],
  ])("matches %s and %s", (a, b) => {
    expect(matchKey(a)).toBe(matchKey(b));
  });

  it("keeps different names apart", () => {
    expect(matchKey("Paper Lanterns")).not.toBe(matchKey("Paper Lantern"));
  });

  it("keeps letters and numbers in any script", () => {
    expect(matchKey("東京 2020")).toBe("東京2020");
  });

  it("uses the lower-case name when nothing would be left", () => {
    expect(matchKey("!!! ?")).toBe("!!! ?");
  });
});
