import type { Connector, NormalisedFundraiser } from "../types";

const AVATAR = (seed: string, bg: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}`;

const TEAM = {
  id: "team_hope",
  name: "Hope Collective",
  image: AVATAR("HopeCollective", "d4c4a8"),
  url: "https://example.org/teams/hope",
  goal: 40000,
  amountRaised: 18640,
  progress: 0.466,
  memberCount: 12,
};

const EVENT = {
  name: "City Challenge 2026",
  date: "2026-05-17",
  location: "Melbourne",
  url: "https://example.org/events/city-challenge",
  logo: AVATAR("CityChallenge", "1f4a45"),
};

function person(partial: Omit<NormalisedFundraiser, "team" | "event" | "custom">): NormalisedFundraiser {
  return { ...partial, team: TEAM, event: EVENT, custom: {} };
}

export const DUMMY_FUNDRAISERS: NormalisedFundraiser[] = [
  person({
    individual: {
      id: "peter",
      firstName: "Peter",
      lastName: "Walsh",
      fullName: "Peter Walsh",
      profileImage: AVATAR("PeterWalsh", "c45c3e"),
      profileUrl: "https://example.org/p/peter",
    },
    fundraising: {
      goal: 5000,
      amountRaised: 3275,
      progress: 0.655,
      donationCount: 28,
      currency: "AUD",
    },
    story: {
      motivation: "Running every sunrise until Sarah's treatment is fully funded.",
      personalMessage: "Every kilometre is for Sarah.",
      biography: "Peter is raising funds while training for the City Challenge.",
    },
    relationship: { connection: "sister", supporting: "his sister Sarah" },
    activity: {
      type: "Running",
      name: "Sunrise miles",
      distanceKm: 84,
      targetDistanceKm: 120,
      date: "2026-05-17",
      location: "Melbourne",
    },
  }),
  person({
    individual: {
      id: "alex",
      firstName: "Alex",
      lastName: "Nguyen",
      fullName: "Alex Nguyen",
      profileImage: AVATAR("AlexNguyen", "3c6e67"),
      profileUrl: "https://example.org/p/alex",
    },
    fundraising: {
      goal: 2500,
      amountRaised: 980,
      progress: 0.392,
      donationCount: 11,
      currency: "AUD",
    },
    story: {
      motivation: "Walking with a friend who never walks alone.",
      personalMessage: "Join me for the long walk.",
      biography: "Alex is walking the event route in honour of a close friend.",
    },
    relationship: { connection: "friend", supporting: "a friend" },
    activity: {
      type: "Walking",
      name: "Coastal walk",
      distanceKm: 22,
      targetDistanceKm: 42,
      date: "2026-05-17",
      location: "St Kilda",
    },
  }),
  person({
    individual: {
      id: "alan",
      firstName: "Alan",
      lastName: "Brooks",
      fullName: "Alan Brooks",
      profileImage: AVATAR("AlanBrooks", "c9a227"),
      profileUrl: "https://example.org/p/alan",
    },
    fundraising: {
      goal: 8000,
      amountRaised: 8120,
      progress: 1.015,
      donationCount: 41,
      currency: "AUD",
    },
    story: {
      motivation: "Cycling the long way around for a charity that changed our family.",
      personalMessage: "The charity carried us. Now we ride.",
      biography: "Alan is cycling to thank the charity that supported his family.",
    },
    relationship: { connection: "charity", supporting: "his charity" },
    activity: {
      type: "Cycling",
      name: "Bay loop",
      distanceKm: 110,
      targetDistanceKm: 100,
      date: "2026-05-17",
      location: "Port Phillip",
    },
  }),
  person({
    individual: {
      id: "richi",
      firstName: "Richi",
      lastName: "Patel",
      fullName: "Richi Patel",
      profileImage: AVATAR("RichiPatel", "1a1915"),
      profileUrl: "https://example.org/p/richi",
    },
    fundraising: {
      goal: 3000,
      amountRaised: 1460,
      progress: 0.487,
      donationCount: 16,
      currency: "AUD",
    },
    story: {
      motivation: "Running alongside a colleague who showed up when it counted.",
      personalMessage: "This one's for the office legend.",
      biography: "Richi is running for a colleague facing a long recovery.",
    },
    relationship: { connection: "colleague", supporting: "his colleague" },
    activity: {
      type: "Running",
      name: "Relay miles",
      distanceKm: 31,
      targetDistanceKm: 50,
      date: "2026-05-17",
      location: "Docklands",
    },
  }),
];

export const dummyConnector: Connector = {
  id: "dummy",
  name: "Demo fundraising API",
  async listFundraisers() {
    return DUMMY_FUNDRAISERS;
  },
  async getFundraiser(id: string) {
    return DUMMY_FUNDRAISERS.find((row) => row.individual.id === id) ?? null;
  },
};
