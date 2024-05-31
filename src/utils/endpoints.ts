import { DEFAULT_REGISTRY_URL } from "./constants";

export const getMarketplaceEndpoint = (): string => {
    return process.env.OVSX_REGISTRY_URL ?? process.env.VSX_REGISTRY_URL ?? DEFAULT_REGISTRY_URL;
};
