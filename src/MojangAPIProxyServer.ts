import HTTP from "http";
import Express from "express";
import axios from "axios";
import UUIDUtils from "./helpers/UUIDHelper";
import NodeCache from "node-cache";
import UsernameToUUIDResponse from "./responses/UsernameToUUIDResponse";
import CachedUsernameToUUIDData from "./responses/CachedUsernameToUUIDData";
import { setCorsHeaders } from "./cors/CorsMiddleware";
import IConfiguration from "./configuration/IConfiguration";

export default class MojangAPIProxyServer {
    private express: Express.Express;
    private http: HTTP.Server;
    private cache: NodeCache;

    constructor(config: IConfiguration) {
        this.express = Express();
        this.express.set("port", config.port);

        this.express.disable('x-powered-by');
        this.express.use(setCorsHeaders);

        this.cache = new NodeCache({
            stdTTL: config.cache.ttl,
            checkperiod: config.cache.checkperiod
        });

        this.http = new HTTP.Server(this.express);

        this.express.get("/user/:username", async (req: Express.Request, res: Express.Response) => {
            const username: string = req.params.username;

            if (username.length == 0 || username.length > 16 || !username.match(/^[a-zA-Z0-9_]+$/)) {
                res.status(400).json({ response: 400, reason: "Invalid username (doesn't match criteria)" });
                return;
            }

            const cacheKey = "profile:" + username.toLocaleLowerCase();

            if (this.cache.has(cacheKey)) {
                const result = this.cache.get<CachedUsernameToUUIDData>(cacheKey);

                if (result.cached) {
                    res.status(200).json(result);
                } else {
                    res.status(404).json({ response: 404, reason: "User not found" });
                }
                return;
            }

            const response = await axios.get("https://api.mojang.com/users/profiles/minecraft/" + username);
            const { status } = response;

            if (status == 204) {
                const cacheData: CachedUsernameToUUIDData = {
                    data: null,
                    cached: false
                }

                this.cache.set(cacheKey, cacheData);
                res.status(404).json({ response: 404, reason: "User not found" });
                return;
            } else if (status == 429) {
                res.status(429).json({ response: 429, reason: "Ratelimit exception" });
                return;
            }

            const result: UsernameToUUIDResponse = {
                uuid: UUIDUtils.expandUUID(response.data.id)
            }

            const cacheData: CachedUsernameToUUIDData = {
                data: result,
                cached: true
            }

            this.cache.set(cacheKey, cacheData);
            res.status(200).json(result);
        });

        this.http.listen(config.port, function () {
            console.log("Listening on port: " + config.port);
        });
    }
}