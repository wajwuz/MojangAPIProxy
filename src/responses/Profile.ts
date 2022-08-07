import Property from "./Property";

export default interface Profile {
	data: ProfileData
}

export interface ProfileData {
	id: string,
	name: string,
	properties: Property[];
}