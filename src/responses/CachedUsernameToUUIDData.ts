import UsernameToUUIDResponse from "./UsernameToUUIDResponse";

export default interface CachedUsernameToUUIDData {
	data: UsernameToUUIDResponse | null,
	found: boolean
}