import { Db } from "mongodb";
import { Brain } from "../Brain";

import discord = require("@discordjs/collection");
import { Model } from "../Controllers/ModelBase";
import { Channel } from "../Types/Channel";
import { Category } from "../Types/Category";
import puppeteer from "puppeteer";

export class ChannelsModel extends Model {

    public cache: discord.Collection<string, Channel>;
    public categories: discord.Collection<string, Category> = new discord.Collection();

    private defaultConfiguration: Channel;

    private brain: Brain;
    constructor(brain: Brain, database: Db) {
        super("channels", database);

        this.cache = new brain.collectionClass();

        this.loadCategories().then(() => {
            this.brain.log("Categories loaded", { tags: ["Category"], color: "yellow" });

            this.loadCache().then(() => {
                this.brain.log("Cache loaded", { tags: ["Channels"], color: "green" });

                brain.emit("ready");
            });
        });

        this.brain = brain;

        this.defaultConfiguration = {
            code: "",
            name: "",
            category: "",
            image: "",
            link: "",
        } as Channel;
    }

    private async loadCategories(): Promise<void> {
        return puppeteer.launch().then(async (browser) => {
            let page = await browser.newPage();

            await page.goto("https://reidoscanais.app/");
            await page.waitForSelector("#categoria");
            await page.waitForSelector(".canais");

            const selectOptions = await page.evaluate(() => {
                const options = document.querySelectorAll("#categoria option");

                return Array.from(options).map((option) => {
                    return {
                        code: option.getAttribute("value") || "",
                        name: option.textContent || "",
                    };
                });
            });

            for (const option of selectOptions) {
                this.categories.set(option.name, {
                    name: option.name,
                    channels: [],
                });
                this.brain.log(`Category ${option.name} loaded`, { tags: ["Category"], color: "yellow" });
            }

            await page.evaluate(() => {
                const parentDivs = Array.from(document.querySelectorAll(".canais"));

                const allDivsInfo: any[] = [];

                parentDivs.forEach(parentDiv => {
                    const imagemDivs = Array.from(parentDiv.querySelectorAll('.imagem'));
                    const informacoesDivs = Array.from(parentDiv.querySelectorAll('.informacoes'));

                    if (imagemDivs.length === informacoesDivs.length) {
                        for (let i = 0; i < imagemDivs.length; i++) {
                            const imagemDiv = imagemDivs[i];
                            const informacoesDiv = informacoesDivs[i];

                            allDivsInfo.push({
                                code: informacoesDiv.querySelector("a")?.getAttribute("href")?.replace("https://reidoscanais.app/embed/?id=", ""),
                                name: informacoesDiv.querySelector("h2")?.textContent,
                                category: informacoesDiv.querySelector("p")?.textContent,
                                image: imagemDiv.querySelector("img")?.getAttribute("src"),
                                link: informacoesDiv.querySelector("a")?.getAttribute("href"),
                            });
                        }
                    } else {
                        console.error("Número de divs de imagem e informações não corresponde.");
                    }
                });
                return allDivsInfo;
            }).then(async (divs) => {
                for (const div of divs) {
                    const category = this.categories.find((c) => c.name === div.category);

                    if (category) {
                        category.channels.push(div);

                        if (!this.find({ code: div.code })) {
                            this.insert(div);
                        }
                        this.brain.log(`Channel ${div.name} loaded`, { tags: ["Channel"], color: "green" });
                    }
                }
                this.brain.log("Channels loaded", { tags: ["Channels"], color: "green" });

                await browser.close();
            });
        });
    }

    private async loadCache(): Promise<void> {
        const all = (await this.base.find({}).toArray()) as unknown as Channel[];

        for (const item of all) {
            for (const key in this.defaultConfiguration) {
                if (!item.hasOwnProperty(key)) {
                    (item as any)[key] = this.defaultConfiguration[key as keyof Channel];
                }
            }

            this.cache.set(item.code, item);
        }
    }

    public find(query: Partial<Channel>): Channel | undefined {
        return this.cache.find((item: Channel) => {
            for (const key in query) {
                if (query.hasOwnProperty(key) && item[key as keyof Channel] !== query[key as keyof Channel]) {
                    return false;
                }
            }

            for (const key in this.defaultConfiguration) {
                if (!item.hasOwnProperty(key)) {
                    (item as any)[key] = this.defaultConfiguration[key as keyof Channel];
                }
            }

            return true;
        });
    }

    public list(query: Partial<Channel>): Channel[] {
        return this.cache
            .map((c) => c)
            .filter((item: Channel) => {
                for (const key in query) {
                    if (query.hasOwnProperty(key) && item[key as keyof Channel] !== query[key as keyof Channel]) {
                        return false;
                    }
                }

                for (const key in this.defaultConfiguration) {
                    if (!item.hasOwnProperty(key)) {
                        (item as any)[key] = this.defaultConfiguration[key as keyof Channel];
                    }
                }

                return true;
            });
    }

    public insert(data: Channel): void {
        this.base.insertOne(data);

        this.cache.set(data.code, data);
    }

    public update(query: Partial<Channel>, data: Partial<Channel>): void {
        this.base.updateOne(query, { $set: { ...data } });

        const item: any = this.find(query);

        if (!item) return;

        for (const key in data) {
            item[key as keyof Channel] = data[key as keyof Channel];
        }
    }

    public delete(data: Channel): void {
        this.base.deleteOne({ code: data.code });

        this.cache.delete(data.code);
    }
}
