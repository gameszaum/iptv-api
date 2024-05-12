import { Collection, Db, Document } from "mongodb";

import { v4 } from "uuid";

export class Model {
    public name: string;

    public database: Db;

    public base: Collection<Document>;

    public cache: any;

    constructor(name: string, database: Db) {
        this.name = name;

        this.database = database;

        this.base = this.database.collection(this.name);

        this.database
            .listCollections({ name: this.name })
            .toArray()
            .then((collections) => {
                if (!collections.find((c) => c.name === this.name))
                    this.database.createCollection(this.name).catch((err) => true);

                console.log("YA");
            });
    }

    public find(query: any): any | undefined {
        return this.cache.find((item: any) => {
            for (const key in query) {
                if (item[key as keyof any] !== query[key]) return false;
            }

            return true;
        });
    }
    public delete(data = {} as any): void {
        this.base.deleteOne({ id: data.id });

        this.cache.delete(data.id);
    }

    public count(): number {
        return this.cache.size;
    }

    public get getV4(): string {
        const id = v4();

        const exists = this.find({ id });

        if (exists) return this.getV4;

        return id;
    }
}
