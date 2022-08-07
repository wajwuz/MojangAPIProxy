import HTTP from "http";
import Express from "express";
import axios from "axios";
import UUIDUtils from "./UUIDUtils";
import NodeCache from "node-cache";
import { isValidUUIDV4 } from "is-valid-uuid-v4";
import UsernameToUUIDResponse from "./responses/UsernameToUUIDResponse";
import CachedUsernameToUUIDData from "./responses/CachedUsernameToUUIDData";
import CachedProfileData from "./responses/CachedProfileData";
import Profile from "./responses/Profile";
import { setCorsHeaders } from "./cors/CorsMiddleware";

export default class MojangAPIProxyServer {
    private express: Express.Express;
    private http: HTTP.Server;
    private cache: NodeCache;

    constructor(port: number) {
        console.log("Starting mojang api proxy instance...");

        this.express = Express();
        this.express.set("port", port);

        this.express.disable('x-powered-by');
        this.express.use('/', Express.static(__dirname + '/../index'));
        this.express.use(setCorsHeaders);

        this.cache = new NodeCache({
            stdTTL: 120,
            checkperiod: 120
        });

        this.http = new HTTP.Server(this.express);

        this.express.get("/username_to_uuid/:username", async (req: Express.Request, res: Express.Response) => {
            const username: string = "" + req.params.username;

            if (username.length == 0 || username.length > 16 || !username.match(/^[0-9a-zA-Z]+$/)) {
                res.status(400).send("400: Invalid username");
                return;
            }

            const cacheKey = "username_to_uuid:" + username.toLocaleLowerCase();

            if (this.cache.has(cacheKey)) {
                const result = this.cache.get<CachedUsernameToUUIDData>(cacheKey);
                if (result.found) {
                    console.log("Fetched uuid of " + username + " from cache");
                    res.status(200).send(JSON.stringify(result.data, null, 4));
                    return;
                } else {
                    console.log("Could not find user " + username + " from cache");
                    res.status(404).send("404: user not found");
                    return;
                }
            }

            const response = await (await axios.get("https://api.mojang.com/users/profiles/minecraft/" + username));

            if (response.status == 204) {
                const cacheData: CachedUsernameToUUIDData = {
                    data: null,
                    found: false
                }
                this.cache.set(cacheKey, cacheData);
                console.log("Could not find user " + username + " from mojang api");
                res.status(404).send("404: user not found");
                return;
            }

            const result: UsernameToUUIDResponse = {
                uuid: UUIDUtils.expandUUID(response.data.id)
            }

            const cacheData: CachedUsernameToUUIDData = {
                data: result,
                found: true
            }

            this.cache.set(cacheKey, cacheData);

            console.log("Fetched uuid of " + username + " from mojang api");
            res.header("Content-Type", 'application/json');
            res.status(200).send(JSON.stringify(result, null, 4));
        });

        this.express.get("/profile/:uuid", async (req: Express.Request, res: Express.Response) => {
            let uuid: string = "" + req.params.uuid;

            uuid = uuid.toLocaleLowerCase();

            if (uuid.length == 32) {
                uuid = UUIDUtils.expandUUID(uuid);
            }

            if (!isValidUUIDV4(uuid)) {
                res.status(400).send("400: Invalid uuid");
                return;
            }

            const cacheKey = "profile:" + uuid;

            if (this.cache.has(cacheKey)) {
                const result = this.cache.get<CachedProfileData>(cacheKey);
                if (result.found) {
                    console.log("Fetched profile of " + uuid + " from cache");
                    res.header("Content-Type", 'application/json');
                    res.status(200).send(JSON.stringify(result.data, null, 4));
                    return;
                } else {
                    console.log("Could not find profile " + uuid + " from cache");
                    res.status(404).send("404: user not found");
                    return;
                }
            }

            const response = await (await axios.get("https://sessionserver.mojang.com/session/minecraft/profile/" + uuid));

            if (response.status == 204) {
                const cacheData: CachedProfileData = {
                    data: null,
                    found: false
                }
                this.cache.set(cacheKey, cacheData);
                console.log("Could not find profile " + uuid + " from mojang api");
                res.status(404).send("404: user not found");
                return;
            }

            const result: Profile = response.data;

            const cacheData: CachedProfileData = {
                data: result,
                found: true
            }

            this.cache.set(cacheKey, cacheData);

            console.log("Fetched profile of " + uuid + " from mojang api");
            res.header("Content-Type", 'application/json');
            res.status(200).send(JSON.stringify(result, null, 4));
        });

        this.http.listen(port, function () {
            console.log("Listening on port: " + port);
        });
    }
}