import { Brain } from "../Brain";

import { Collection } from "@discordjs/collection";
import { UserSession } from "../Types/UserSession";
import { User } from "../Types/User";

import jwt = require("jsonwebtoken");

type credentials = {
    email: string;
    password: string;
};

export class WebSessionManager {
    private jwt_secret: string = process.env.JWT_SECRET as string;

    private brain: Brain;

    public sessions: Collection<string, UserSession> = new Collection();

    constructor(brain: Brain) {
        this.brain = brain;
    }

    public validateSession(token: string): Promise<false | credentials> {
        return new Promise((res: any) => {
            jwt.verify(token, this.jwt_secret, (err: any, decoded: any) => {
                if (err) return res(false);

                return res(decoded);
            });
        });
    }

    public generateToken({ email, password }: credentials): string {
        const token = jwt.sign({ email, password }, this.jwt_secret, { expiresIn: "1d" });

        return token;
    }

    public createSession(credentials: credentials, user: User, alreadToken?: string): UserSession {
        const token = alreadToken || this.generateToken(credentials);

        if (this.sessions.has(token)) this.sessions.delete(token);

        const session: UserSession = {
            email: user.email,
            token,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            activeDate: user.activeDate,
        };

        this.sessions.set(token, session);

        console.log(session);
        return session;
    }
}