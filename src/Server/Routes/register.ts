import { WithId } from "mongodb";
import { Server } from "..";
import { Route } from "../../Types/Route";
import { Request, Response } from "express";
import { User } from "../../Types/User";

export default class Register implements Route {
    private server: Server;

    constructor(server: Server) {
        this.server = server;
    }

    public requiredAuth: boolean = false;

    public method: "get" | "post" | "put" | "delete" = "post";

    public path: string = "/register";

    public async execute(req: Request, res: Response): Promise<Response> {
        const { email, password } = req.body as { email: string; password: string };

        const find = this.server.brain.models.users.find({
            email: email
        }) as WithId<User>;

        if (find) return res.status(404).json({ error: "Um usuário com esse email já existe." });

        const user: User = {
            email,
            password,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            activeDate: 0,
            banned: false
        };

        this.server.brain.models.users.insert(user);

        const session = this.server.brain.SessionManager.createSession(
            {
                email,
                password,
            },
            user
        );

        return res.status(200).json({ session, success: true });
    }
}
