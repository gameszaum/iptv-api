import { join } from "path";

import helmet from "helmet";

import { readdirSync, statSync } from "fs";
import { Route } from "../Types/Route";
import { Brain } from "../Brain";
import { rateLimit } from "express-rate-limit";
import { urlencoded } from "body-parser";
import express = require("express");
import cors = require("cors");

const limiter = rateLimit({
    windowMs: 60000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
});

const app = express();

app.use(express.json({ limit: "50mb" }));

app.use(express.static(join(__dirname, "..", "..", "..", "src", "Server", "public")));

app.use(cors({ origin: "*" }));

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            frameAncestors: "*",
        },
    })
);
app.use((req, res, next) => {
    // Configuração do cabeçalho CSP para permitir iframes de qualquer origem
    res.setHeader("Content-Security-Policy", "frame-ancestors *");

    next();
});

app.use(urlencoded({ extended: true }));
//app.use(limiter);

export class Server {
    private port: number = Number(process.env.PORT);

    public app: express.Application;

    public brain: Brain;

    public appServer: any;

    constructor(brain: Brain) {
        this.app = app;

        this.brain = brain;

        this.appServer = app.listen(this.port, () => {
            this.brain.log(`Server listening on port ${this.port}`, {
                tags: ["Server"],
            });
        });

        this.brain.on("ready", () => {
            this.loadRoutes();
        });
    }

    public loadRoutes(dir = ""): void {
        const files = readdirSync("dist/src/Server/Routes" + dir);

        files.forEach(async (file) => {
            const path = join("dist/src/Server/Routes" + dir, file);

            if (statSync(path).isDirectory()) {
                this.loadRoutes(dir + "/" + file);
            } else {
                const Route = await import("./Routes" + dir + "/" + file);

                const RouteInstance = new Route.default(this) as Route;

                this.server[RouteInstance.method](RouteInstance.path, (req, res) => {
                    const token = req.headers["authorization"] as string;
                    const ip = (req.connection.remoteAddress as string).replace("::ffff:", "");

                    const allowed_ips = [
                        "189.115.206.127",
                        "177.82.134.139",
                        "181.214.48.16",
                        "181.214.221.21",
                        "108.165.179.141"
                    ] as string[];

                    if (!allowed_ips.includes(ip))
                        return res.status(401).json({ error: "Você não pode requisitar a API, o seu IP não está permitido." });

                    if (RouteInstance.requiredAuth) {
                        if (!token) return res.status(401).json({ error: "Falha na autenticação. Logue novamente." });

                        this.brain.SessionManager.validateSession(token).then(async (validate) => {
                            if (!validate) return res.status(401).json({ error: "Falha na autenticação. Logue novamente." });

                            const find = this.brain.models.users.find({
                                email: validate.email,
                            });

                            if (!find) return res.status(401).json({ error: "Falha na autenticação. Logue novamente." });

                            RouteInstance.execute(req, res, find);
                        });
                    } else {
                        this.brain.SessionManager.validateSession(token).then(async (validate) => {
                            if (!validate) return RouteInstance.execute(req, res);

                            const find = this.brain.models.users.find({
                                email: validate.email,
                            });

                            if (!find) return RouteInstance.execute(req, res);

                            RouteInstance.execute(req, res, find);
                        });
                    }
                });

                this.brain.log(`Loaded route ${RouteInstance.method.toUpperCase()} ${RouteInstance.path}`, {
                    tags: ["Server"],
                });
            }
        });
    }

    private get server(): express.Application {
        return this.app;
    }
}