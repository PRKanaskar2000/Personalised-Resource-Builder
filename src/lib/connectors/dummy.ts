import type { Connector, NormalisedFundraiser } from "../types";

// The sample data shown in the editor. Text values are simply the name of the field
// ("User Name", "Team Name"), so it is obvious which words on a resource are dynamic.
// On a real fundraising page the embed replaces them with the member's own values.

// A plain grey person icon, used as the sample photo (kept inside the code so it always loads)
const SAMPLE_PHOTO =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#d9d4c9"/>' +
      '<circle cx="100" cy="78" r="38" fill="#8f8a80"/><path d="M28 200c0-42 32-70 72-70s72 28 72 70z" fill="#8f8a80"/></svg>',
  );

export const SAMPLE_FUNDRAISER: NormalisedFundraiser = {
  individual: {
    id: "sample",
    firstName: "User Name",
    lastName: "Last Name",
    fullName: "Full Name",
    profileImage: SAMPLE_PHOTO,
    profileUrl: "",
  },
  fundraising: {
    goal: 1000,
    amountRaised: 650,
    progress: 0.65,
    donationCount: 12,
    largestDonation: 100,
    averageDonation: 54,
    currency: "AUD",
  },
  story: { motivation: "", personalMessage: "", biography: "" },
  relationship: { connection: "", supporting: "Connection" },
  activity: {
    type: "Activity",
    name: "",
    distanceKm: 42,
    targetDistanceKm: 100,
    progress: 0.42,
    date: "",
    location: "",
  },
  team: {
    id: "sample_team",
    name: "Team Name",
    image: "",
    url: "",
    goal: 5000,
    amountRaised: 3200,
    progress: 0.64,
    memberCount: 8,
    donationCount: 48,
    distanceKm: 320,
    targetDistanceKm: 500,
    fitnessProgress: 0.64,
  },
  organisation: { name: "Organisation Name" },
  event: {
    name: "Event Name",
    date: "",
    location: "",
    url: "",
    logo: "",
    goal: 100000,
    amountRaised: 64000,
    progress: 0.64,
    donationCount: 950,
  },
  // Custom variables come from the settings and show their label (see withSampleCustomFields)
  custom: {},
  // Filled in by the app from the settings (see withDerivedValues)
  impact: {},
  teamImpact: {},
};

export const dummyConnector: Connector = {
  id: "dummy",
  name: "Sample data",
  async listFundraisers() {
    return [SAMPLE_FUNDRAISER];
  },
  async getFundraiser(id: string) {
    return id === SAMPLE_FUNDRAISER.individual.id ? SAMPLE_FUNDRAISER : null;
  },
};
