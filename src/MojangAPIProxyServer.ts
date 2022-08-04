import HTTP from "http";
import Express from "express";
import axios from "axios";
import UUIDUtils from "./UUIDUtils";

export default class MojangAPIProxyServer {
    private express: Express.Express;
	private http: HTTP.Server;

    constructor(port: number) {
        console.log("Starting mojang api proxy instance...");

        this.express = Express();
		this.express.set("port", port);

		this.http = new HTTP.Server(this.express);

        this.express.get("/username_to_uuid/:username", async (req: Express.Request, res: Express.Response) => {
			let username: string = "" + req.params.username;
			
            if(username.length == 0 || username.length > 16 || !username.match(/^[0-9a-zA-Z]+$/)) {
                res.status(400).send("400: Invalid username");
				return;
            }

            const response = await (await axios.get("https://api.mojang.com/users/profiles/minecraft/" + username));
            console.log(response);

            if(response.status == 204) {
                res.status(404).send("404: user not found");
                return;
            }

            const responseObject = {
                uuid: UUIDUtils.expandUUID(response.data.id)
            }

            res.status(200).send(responseObject);
		});

        this.http.listen(port, function () {
			console.log("Listening on port: " + port);
		});
    }
}