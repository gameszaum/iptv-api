import { WithId } from "mongodb";
import { Server } from "..";
import { Route } from "../../Types/Route";
import { Request, Response } from "express";
import { User } from "../../Types/User";

export default class UpdateUser implements Route {
    private server: Server;

    constructor(server: Server) {
        this.server = server;
    }

    public requiredAuth: boolean = false;

    public method: "get" | "post" | "put" | "delete" = "post";

    public path: string = "/updateUser";

    public async execute(req: Request, res: Response): Promise<Response> {
        const { email, activeDate, banned, affiliate } = req.body as { email: string; activeDate: number; banned: boolean, affiliate: boolean };

        const token = req.headers["authorization"] as string;

        if (token) {
            const validate = await this.server.brain.SessionManager.validateSession(token);

            if (!validate) return res.status(404).json({ error: "Invalid token" });

            const find = this.server.brain.models.users.find({ email }) as WithId<User>;

            if (!find) return res.status(404).json({ error: "Usuário não encontrado." });

            if (activeDate !== undefined) find.activeDate = activeDate;

            if (banned !== undefined) find.banned = banned;

            if (affiliate !== undefined) find.affiliate = affiliate;

            this.server.brain.models.users.update({ email }, find);

            return res.status(200).json({ success: true, user: find });
        } else {
            return res.status(400).json({ error: "Você não tem permissão para acessar essa rota." });
        }
    }
}
