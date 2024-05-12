import { Db } from "mongodb";
import { Brain } from "../Brain";
import discord = require("@discordjs/collection");
import { Model } from "../Controllers/ModelBase";
import { User } from "../Types/User";

export class UsersModel extends Model {
    public cache: discord.Collection<string, User>;

    private defaultConfiguration: User;

    private brain: Brain;
    constructor(brain: Brain, database: Db) {
        super("users", database);

        this.cache = new brain.collectionClass();

        this.loadCache();

        this.brain = brain;

        this.defaultConfiguration = {
            email: "",
            password: "",
            createdAt: 0,
            lastLogin: 0,
            activeDate: 0,
        };
    }

    private async loadCache(): Promise<void> {
        const all = (await this.base.find({}).toArray()) as unknown as User[];

        for (const item of all) {
            for (const key in this.defaultConfiguration) {
                if (!item.hasOwnProperty(key)) {
                    (item as any)[key] = this.defaultConfiguration[key as keyof User];
                }
            }

            this.cache.set(item.email, item);
        }

        setTimeout(() => {
            this.brain.emit("Users-loaded");
        }, 2000);
    }

    public find(query: Partial<User>): User | undefined {
        return this.cache.find((item: User) => {
            for (const key in query) {
                if (query.hasOwnProperty(key) && item[key as keyof User] !== query[key as keyof User]) {
                    return false;
                }
            }

            for (const key in this.defaultConfiguration) {
                if (!item.hasOwnProperty(key)) {
                    (item as any)[key] = this.defaultConfiguration[key as keyof User];
                }
            }

            return true;
        });
    }

    public list(query: Partial<User>): User[] {
        return this.cache
            .map((c) => c)
            .filter((item: User) => {
                for (const key in query) {
                    if (query.hasOwnProperty(key) && item[key as keyof User] !== query[key as keyof User]) {
                        return false;
                    }
                }

                for (const key in this.defaultConfiguration) {
                    if (!item.hasOwnProperty(key)) {
                        (item as any)[key] = this.defaultConfiguration[key as keyof User];
                    }
                }

                return true;
            });
    }

    public insert(data: User): void {
        const item: any = this.find(data);

        if (!item) {
            this.base.insertOne(data);
        }
        this.cache.set(data.email, data);
    }

    public update(query: Partial<User>, data: Partial<User>): void {
        this.base.updateOne(query, { $set: { ...data } });

        const item: any = this.find(query);

        if (!item) return;

        for (const key in data) {
            item[key as keyof User] = data[key as keyof User];
        }
    }

    public delete(query: User): void {
        this.base.deleteOne({ email: query.email });

        this.cache.delete(query.email);
    }
}
