import { WithId } from "mongodb";
import { Server } from "..";
import { Route } from "../../Types/Route";
import { Request, Response } from "express";
import { User } from "../../Types/User";

export default class Login implements Route {
    private server: Server;

    constructor(server: Server) {
        this.server = server;
    }

    public requiredAuth: boolean = false;

    public method: "get" | "post" | "put" | "delete" = "post";

    public path: string = "/login";

    public async execute(req: Request, res: Response): Promise<Response> {
        const { email, password } = req.body as { email: string; password: string };

        const token = req.headers["authorization"] as string;

        if (token) {
            const validate = await this.server.brain.SessionManager.validateSession(token);

            if (!validate) return res.status(404).json({ error: "Invalid token" });

            const find = this.server.brain.models.users.find({
                email: validate.email,
                password: validate.password,
            }) as WithId<User>;

            if (!find) return res.status(404).json({ error: "Usuário ou senha incorretos." });

            if (find.banned) return res.status(404).json({ error: "Usuário banido." });

            const renewToken = this.server.brain.SessionManager.generateToken({
                email: find.email,
                password: find.password,
            });

            return res.status(200).json({ access_token: renewToken });
        } else {
            const find = this.server.brain.models.users.find({
                email,
                password,
            }) as User;

            if (!find) return res.status(404).json({ error: "Usuário ou senha incorretos." });

            if (find.banned) return res.status(404).json({ error: "Usuário banido." });

            const session = this.server.brain.SessionManager.createSession(
                {
                    email,
                    password,
                },
                find,
                token
            );

            return res.status(200).json({ session, success: true });
        }
    }
}
