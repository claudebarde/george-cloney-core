import type { Config } from "./types";

const config: Config = {
  defaultRpcUrls: {
    MAINNET: "https://mainnet.api.tez.ie",
    HANGZHOUNET: "https://hangzhounet.api.tez.ie",
    GRANADANET: "https://granadanet.api.tez.ie",
    FLORENCENET: "https://florencenet.api.tez.ie",
    CUSTOM: ""
  },
  indexerUrl: "https://api.hangzhou2net.tzkt.io/v1/"
};

export default config;
