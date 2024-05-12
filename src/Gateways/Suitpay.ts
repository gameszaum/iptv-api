import axios from "axios";
import { Brain } from "../Brain";
import { User } from "../Types/User";
import { Transaction } from "../Types/Transaction";

export type Gateway = {
    _id?: string;
    name: string;
    id: string;
    credentials: { [key: string]: string };
    rate: string;
    status: boolean;
    order: number;
    min_dep: number;
};

export class SuitPay {
    private client_id: string = process.env.SUITPAY_CLIENT_ID as string;
    private client_secret: string = process.env.SUITPAY_CLIENT_SECRET as string;

    public url: string = "https://ws.suitpay.app/api/v1/gateway";

    public brain: Brain;

    public name: string = "suitpay";

    constructor(brain: Brain) {
        this.brain = brain;

        this.brain.on("ready", () => {
            this.listenTransactions();
        });
    }

    public async createTransaction($data: any, nosso = false): Promise<any> {
        const { client_id, client_secret } = {
            client_id: this.client_id,
            client_secret: this.client_secret,
        };

        return new Promise(async (res) => {
            const types = {
                deposit: "/request-qrcode",
                withdraw: "/pix-payment",
                ggr: "/request-qrcode",
            };
            const path = types[$data.type as keyof typeof types];

            delete $data.type;

            axios
                .post(
                    `${this.url}${path}`,
                    {
                        ...$data,
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            ci: client_id,
                            cs: client_secret,
                        },
                    }
                )
                .then(({ data }) => {
                    return res(data);
                })
                .catch((err) => {
                    console.log(err, $data);
                    return res(false);
                });
        });
    }

    public listenTransactions(): void {
        this.brain.log("Listening SuitPay transactions", {
            tags: ["SuitPay"],
            color: "green",
        });

        this.brain.server.app.post("/admin/suitpay/deposit", async (req, res) => {
            console.log(req);
            const { idTransaction, statusTransaction } = req.body as {
                idTransaction: string;
                statusTransaction: string;
                typeTransaction: string;
            };

            const transaction = this.brain.models.transactions.find({ id: idTransaction }) as Transaction;

            if (!transaction) return console.log({ error: "Transaction not found" });

            if (transaction.status !== "PENDING") return console.log({ error: "Transaction already processed" });

            if (statusTransaction !== "PAID_OUT") return console.log({ error: "Invalid status" });

            transaction.status = "PAID_OUT";

            this.brain.models.transactions.update(
                { id: idTransaction },
                {
                    status: "PAID_OUT",
                }
            );

            const user = this.brain.models.users.find({ email: transaction.email }) as User;

            user.activeDate = Date.now();

            res.status(200).end();
        });
    }
}