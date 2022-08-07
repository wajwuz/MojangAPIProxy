import * as FS from "fs";
import MojangAPIProxyServer from "./MojangAPIProxyServer";

require('console-stamp')(console, '[HH:MM:ss.l]');

if (!FS.existsSync("./config.json")) {
    console.log("Creating default configuration");
	let defaultConfig: any = {
		port: 80
	}
	FS.writeFileSync("./config.json", JSON.stringify(defaultConfig, null, 4), 'utf8');
}

const config: any = JSON.parse(FS.readFileSync("./config.json", 'utf8'));

new MojangAPIProxyServer(config.port);