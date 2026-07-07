import { AxiosRequestConfig } from 'axios';

export function externalAxiosOptions(): Pick<AxiosRequestConfig, 'proxy'> {
	// Broken HTTP_PROXY/HTTPS_PROXY env vars (common on NAS images) cause ERR_SOCKET_BAD_PORT (NaN).
	if (process.env.HTTP_PROXY_ENABLED === 'true') {
		return {};
	}

	return { proxy: false };
}
