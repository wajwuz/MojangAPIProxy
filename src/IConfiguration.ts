export default interface IConfiguration {
	port: number,
	cache: ICahceConfiguration
}

export interface ICahceConfiguration {
	ttl: number,
	checkperiod: number
}