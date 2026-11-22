/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";

export const zodHttpsUrl = z.url().refine((value) => {
    try {
        const url = new URL(value);
        return (
            url.protocol === "https:" &&
            url.username === "" &&
            url.password === ""
        );
    } catch {
        return false;
    }
}, "URL must use HTTPS without embedded credentials");
