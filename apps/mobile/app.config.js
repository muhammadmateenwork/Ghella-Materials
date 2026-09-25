// Extends app.json with values that can't live in the repo.
//
// google-services.json (Firebase config for Android push) is git-ignored.
// EAS cloud builds get it from the GOOGLE_SERVICES_JSON file variable
// (eas env:set --type file — see supabase/SETUP.md); local builds and
// `expo start` use the copy in this folder.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
});
