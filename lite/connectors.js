// Connectors turn a fundraising platform's data into OUR field names:
// name, photo, activity, supporting, goal, raised, team.
// Templates only ever use these names, so adding a platform = adding a connector.

const dummy = {
  peter: { name: 'Peter', photo: '/avatar/Peter', activity: 'running', supporting: 'my sister Sarah', goal: 1000, raised: 640, team: 'City Runners' },
  alex: { name: 'Alex', photo: '/avatar/Alex', activity: 'walking', supporting: 'a friend', goal: 500, raised: 180 },
  alan: { name: 'Alan', photo: '/avatar/Alan', activity: 'cycling', supporting: 'my charity', goal: 2000, raised: 1500, team: 'Pedal Power' },
  richi: { name: 'Richi', photo: '/avatar/Richi', activity: 'running', supporting: 'my colleague', goal: 750, raised: 750 },
};

const dummyConnector = {
  list: async () => Object.entries(dummy).map(([id, f]) => ({ id, name: f.name })),
  get: async id => dummy[id] || {},
};

// Raisely (https://developers.raisely.com). Set RAISELY_API_KEY and RAISELY_CAMPAIGN to use it.
// Check the custom field names (public.activity, public.supporting) against your campaign.
const raiselyGet = async path => {
  const res = await fetch('https://api.raisely.com/v3' + path, {
    headers: { Authorization: 'Bearer ' + process.env.RAISELY_API_KEY },
  });
  if (!res.ok) throw new Error('Raisely error ' + res.status);
  return (await res.json()).data;
};

const raiselyConnector = {
  list: async () =>
    (await raiselyGet(`/campaigns/${process.env.RAISELY_CAMPAIGN}/profiles?type=INDIVIDUAL`))
      .map(p => ({ id: p.uuid, name: p.name })),
  get: async id => {
    const p = await raiselyGet('/profiles/' + id);
    return {
      name: p.name,
      photo: p.photoUrl,
      activity: p.public?.activity,
      supporting: p.public?.supporting,
      goal: p.goal / 100, // Raisely amounts are in cents
      raised: p.total / 100,
      team: p.parent?.name,
    };
  },
};

module.exports = process.env.RAISELY_API_KEY ? raiselyConnector : dummyConnector;
