import Profile from "./Profile";

export default interface CachedProfileData {
	data: Profile | null,
	found: boolean
}