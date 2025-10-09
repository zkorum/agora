/** **** WARNING: GENERATED FROM SHARED-APP-API DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import type { NumberType } from "libphonenumber-js/max";

export function isPhoneNumberTypeSupported(type: NumberType): boolean {
    switch (type) {
        case "PERSONAL_NUMBER":
        case "FIXED_LINE_OR_MOBILE":
        case "MOBILE":
        case undefined:
            return true;
        case "FIXED_LINE":
        case "PREMIUM_RATE":
        case "TOLL_FREE":
        case "SHARED_COST":
        case "VOIP":
        case "PAGER":
        case "UAN":
        case "VOICEMAIL":
        default:
            return false;
    }
}
