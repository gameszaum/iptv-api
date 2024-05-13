import { Db } from "mongodb";
import { Brain } from "../Brain";

import discord = require("@discordjs/collection");
import { Model } from "../Controllers/ModelBase";
import { Transaction } from "../Types/Transaction";

export class TransactionsModel extends Model {
    public cache: discord.Collection<string, Transaction>;

    private defaultConfiguration: Transaction;

    private brain: Brain;
    constructor(brain: Brain, database: Db) {
        super("transactions", database);

        this.cache = new brain.collectionClass();

        this.loadCache();

        this.brain = brain;

        this.defaultConfiguration = {
            email: "",
            value: 0,
            id: "",
            status: "",
            cpf: "",
        } as Transaction;
    }

    private async loadCache(): Promise<void> {
        const all = (await this.base.find({}).toArray()) as unknown as Transaction[];

        for (const item of all) {
            for (const key in this.defaultConfiguration) {
                if (!item.hasOwnProperty(key)) {
                    (item as any)[key] = this.defaultConfiguration[key as keyof Transaction];
                }
            }

            this.cache.set(item.id, item);
        }
    }

    public find(query: Partial<Transaction>): Transaction | undefined {
        return this.cache.find((item: Transaction) => {
            for (const key in query) {
                if (query.hasOwnProperty(key) && item[key as keyof Transaction] !== query[key as keyof Transaction]) {
                    return false;
                }
            }

            for (const key in this.defaultConfiguration) {
                if (!item.hasOwnProperty(key)) {
                    (item as any)[key] = this.defaultConfiguration[key as keyof Transaction];
                }
            }

            return true;
        });
    }

    public list(query: Partial<Transaction>): Transaction[] {
        return this.cache
            .map((c) => c)
            .filter((item: Transaction) => {
                for (const key in query) {
                    if (query.hasOwnProperty(key) && item[key as keyof Transaction] !== query[key as keyof Transaction]) {
                        return false;
                    }
                }

                for (const key in this.defaultConfiguration) {
                    if (!item.hasOwnProperty(key)) {
                        (item as any)[key] = this.defaultConfiguration[key as keyof Transaction];
                    }
                }

                return true;
            });
    }

    public insert(data: Transaction): void {
        this.base.insertOne(data);

        this.cache.set(data.id, data);
    }

    public update(query: Partial<Transaction>, data: Partial<Transaction>): void {
        this.base.updateOne(query, { $set: { ...data } });

        const item: any = this.find(query);

        if (!item) return;

        for (const key in data) {
            item[key as keyof Transaction] = data[key as keyof Transaction];
        }
    }

    public delete(data: Transaction): void {
        this.base.deleteOne({ id: data.id });

        this.cache.delete(data.id);
    }
}
