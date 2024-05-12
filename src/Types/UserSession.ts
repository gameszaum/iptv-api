export interface UserSession {
    token: string;
    email: string;
    createdAt: number;
    lastLogin: number;
    activeDate: number;
}