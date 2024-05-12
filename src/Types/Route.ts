export type Route = {
    method: "get" | "post" | "put" | "delete";
    path: string;
    execute: Function;
    requiredAuth?: boolean;
    requiredPermission?: "admin";
};