import { MongoClient } from "mongodb";

import { Collection } from "@discordjs/collection";

import mongoose from "mongoose";

import { SuitPay } from "../Gateways/Suitpay";
import chalk = require("chalk");
import lodash = require("lodash");
import { WebSessionManager } from "../Controllers/SessionManager";
import { UsersModel } from "../Models/Users";
import { Server } from "../Server";
import { TransactionsModel } from "../Models/Transactions";

interface LogOptions {
    tags?: Array<string>;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    reversed?: boolean;
    bgColor?: boolean;
    color?: string;
}

export class Brain {
    public get collectionClass() {
        return Collection;
    }

    public onEvents: Array<[string, Function]> = [];

    public mongoClient: MongoClient = new MongoClient(process.env.MONGO_URI as string);

    public SessionManager: WebSessionManager = new WebSessionManager(this);

    public server: Server = new Server(this);

    public models: {
        users: UsersModel;
        transactions: TransactionsModel;
    } = {
            users: new UsersModel(this, this.mongoClient.db(process.env.MONGO_DB as string)),
            transactions: new TransactionsModel(this, this.mongoClient.db(process.env.MONGO_DB as string)),
        };

    public gateways: { suitpay: SuitPay } = {
        suitpay: new SuitPay(this),
    };

    public async start(): Promise<void> {
        await this.connectDB();

        return;
    }

    public on(event: string, callback: Function): void {
        this.onEvents.push([event, callback]);
    }

    public emit(event: string, ...args: any[]): void {
        for (const [key, value] of this.onEvents) {
            if (key === event) {
                value(...args);
            }
        }
    }

    public async connectDB(): Promise<void> {
        await this.mongoClient.connect().then(() => {
            this.log("Connected to MongoDB", { tags: ["MongoDB"], color: "green" });

            this.emit("ready");
        });

        mongoose.connect(process.env.MONGO_URI as string).then(() => { });
    }

    public log(
        message: string,
        {
            tags: [...tags] = ["Client"],
            bold = false,
            italic = false,
            underline = false,
            reversed = false,
            bgColor = false,
            color = "white",
        } = {} as LogOptions
    ) {
        const colorFunction = lodash.get(
            chalk,
            [bold, italic, underline, reversed, bgColor, color].filter(Boolean).join(".")
        );

        console.log(...tags.map((t) => chalk.cyan(`[${t}]`)), colorFunction(message));
    }
}