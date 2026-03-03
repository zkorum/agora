import { ApiPartialResponseError, ApiRequestError, ApiResponseError, TwitterApiPluginResponseOverride } from '../types';
/* Plugin helpers */
export function hasRequestErrorPlugins(client) {
    var _a;
    if (!((_a = client.clientSettings.plugins) === null || _a === void 0 ? void 0 : _a.length)) {
        return false;
    }
    for (const plugin of client.clientSettings.plugins) {
        if (plugin.onRequestError || plugin.onResponseError) {
            return true;
        }
    }
    return false;
}
export async function applyResponseHooks(requestParams, computedParams, requestOptions, error) {
    let override;
    if (error instanceof ApiRequestError || error instanceof ApiPartialResponseError) {
        override = await this.applyPluginMethod('onRequestError', {
            client: this,
            url: this.getUrlObjectFromUrlString(requestParams.url),
            params: requestParams,
            computedParams,
            requestOptions,
            error,
        });
    }
    else if (error instanceof ApiResponseError) {
        override = await this.applyPluginMethod('onResponseError', {
            client: this,
            url: this.getUrlObjectFromUrlString(requestParams.url),
            params: requestParams,
            computedParams,
            requestOptions,
            error,
        });
    }
    if (override && override instanceof TwitterApiPluginResponseOverride) {
        return override.value;
    }
    return Promise.reject(error);
}
