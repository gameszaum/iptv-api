export type User = {
    email: string;
    password: string;
    createdAt: number;
    lastLogin: number;
    activeDate: number;
    banned: boolean;
    affiliate: boolean;
    affiliateCode: string;
    balance: number;
}