export type TezosContractAddress = `KT1${string}`;
export type BigmapName = string;
export type BigmapId = number;

export enum NetworkType {
  "MAINNET" = "MAINNET",
  "HANGZHOUNET" = "HANGZHOUNET",
  "GRANADANET" = "GRANADANET",
  "FLORENCENET" = "FLORENCENET",
  "CUSTOM" = "CUSTOM"
}

export interface Config {
  defaultRpcUrls: { [p in NetworkType]: string };
  indexerUrl: string;
}

export enum StorageType {
  "EMPTY" = "EMPTY",
  "CURRENT" = "CURRENT",
  "CUSTOM" = "CUSTOM"
}
