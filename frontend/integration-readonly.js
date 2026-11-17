// The isolated CS1 integration bundles exactly the canonical GET-only reader.
// Do not import the production account module or initialize a Supabase client here:
// those can refresh sessions and synchronize student drafts in the background.
export {readOnlyCs1Snapshot,verifiedCs1Snapshot} from '../public/integration/account-bridge.js';
