import "dotenv/config";

import { Brain } from "./Brain";

const brain = new Brain();

brain.start();

process.on("unhandledRejection", (err: any) => {
    brain.log(err.stack, {
        tags: ["Error", "UnhandledRejection"],
    });
});

process.on("uncaughtException", (err: any) => {
    brain.log(err.stack, {
        tags: ["Error", "UncaughtException"],
    });
});