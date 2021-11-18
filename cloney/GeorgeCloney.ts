import {
  TezosToolkit,
  BigMapAbstraction,
  MichelsonMap
} from "@taquito/taquito";
import { validateContractAddress } from "@taquito/utils";
import type { MichelsonV1Expression } from "@taquito/rpc";
import { InMemorySigner } from "@taquito/signer";
import { BeaconWallet } from "@taquito/beacon-wallet";
import BigNumber from "bignumber.js";
import { NetworkType, TezosContractAddress, StorageType } from "./types";
import config from "./config";

export default class GeorgeCloney {
  public networkFrom: NetworkType;
  public networkFromUrl: string;
  public networkTo: NetworkType | undefined;
  public networkToUrl: string | undefined;
  public contractToOriginate:
    | {
        address: TezosContractAddress;
        code: MichelsonV1Expression[];
        storage: any;
      }
    | undefined;
  public signer: BeaconWallet | InMemorySigner | undefined;
  private newStorage: any;
  private newStorageType: StorageType | undefined;
  private TezosFrom: TezosToolkit;
  private TezosTo: TezosToolkit | undefined;
  private taquitoApi: "wallet" | "contract";

  constructor(params: {
    from: NetworkType;
    walletApi: boolean;
    signer: BeaconWallet | InMemorySigner;
    to?: NetworkType;
    options?: { rpcUrlFrom?: string; rpcUrlTo?: string };
  }) {
    const { from, walletApi, signer, to, options } = params;

    if (!Object.values(NetworkType).includes(from)) {
      throw "Unknown network type";
    }

    this.networkFrom = from;
    // check if users passes the right signer
    if (
      (signer instanceof InMemorySigner && walletApi) ||
      (signer instanceof BeaconWallet && !walletApi)
    ) {
      throw "The signer doesn't match the selected API (wallet/contract)";
    }
    this.taquitoApi = walletApi ? "wallet" : "contract";
    // sets the signer
    this.signer = signer;

    if (to) {
      this.networkTo = to;
    }
    // sets RPC URL of existing contract
    if (options?.rpcUrlFrom) {
      this.networkFromUrl = options.rpcUrlFrom;
    } else {
      this.networkFromUrl = config.defaultRpcUrls[from];
    }
    // sets RPC URL for contract to be created
    if (options?.rpcUrlTo) {
      this.networkToUrl = options.rpcUrlTo;
      this.TezosTo = new TezosToolkit(this.networkToUrl);
    }

    // creates an instance of the TezosToolkit
    this.TezosFrom = new TezosToolkit(this.networkFromUrl);
  }

  // fetches the code and the storage of the source contract
  public async fetch(
    contractAddress: TezosContractAddress
  ): Promise<GeorgeCloney> {
    // if provided contract address is invalid
    if (validateContractAddress(contractAddress) !== 3) {
      return Promise.reject(new Error("Fetch: Invalid contract address"));
    }

    try {
      const contract = await this.TezosFrom.contract.at(contractAddress);
      const storage: any = await contract.storage();
      const newContract = {
        address: contractAddress,
        code: contract.script.code,
        storage
      };
      this.contractToOriginate = newContract;

      return this;
    } catch (error) {
      return Promise.reject(new Error(JSON.stringify(error)));
    }
  }

  // add storage for the fetched contract according to user's choice
  public addStorage(storageType: StorageType, storage?: any): GeorgeCloney {
    if (
      !this.contractToOriginate ||
      (this.contractToOriginate && !this.contractToOriginate.storage)
    ) {
      throw "Current storage has not been fetched";
    }

    const newStorage = { ...this.contractToOriginate.storage };
    if (storageType === StorageType.EMPTY) {
      // empty storage
      Object.entries(this.contractToOriginate.storage).forEach(([key, val]) => {
        if (typeof val === "string") {
          newStorage[key] = "";
        } else if (typeof val === "number" || BigNumber.isBigNumber(val)) {
          newStorage[key] = 0;
        } else if (typeof val === "boolean") {
          newStorage[key] = false;
        } else if (val instanceof BigMapAbstraction) {
          newStorage[key] = new MichelsonMap();
        }
      });
    } else if (storageType === StorageType.CURRENT) {
      // current storage
      Object.entries(this.contractToOriginate.storage).forEach(([key, val]) => {
        if (val instanceof BigMapAbstraction) {
          newStorage[key] = new MichelsonMap();
        } else {
          newStorage[key] = val;
        }
      });
    } else if (storageType === StorageType.CUSTOM) {
      // custom storage
      if (!storage) {
        throw "No custom storage provided";
      }

      // compares the provided storage with the saved storage
      const savedStorageKeys = Object.keys(this.contractToOriginate.storage);
      const providedStorageKeys = Object.keys(storage);
      if (savedStorageKeys.length !== providedStorageKeys.length) {
        throw "The provided storage keys don't match the original storage keys";
      } else {
        const sameKeys = savedStorageKeys
          .map(key => providedStorageKeys.includes(key))
          .reduce((a, b) => a && b);
        if (!sameKeys) {
          throw "Different keys in original storage and provided storage";
        } else {
          Object.entries(storage).forEach(([key, val]) => {
            if (val instanceof BigMapAbstraction) {
              newStorage[key] = new MichelsonMap();
            } else {
              newStorage[key] = val;
            }
          });
        }
      }
    }
    this.newStorage = newStorage;
    this.newStorageType = storageType;

    return this;
  }

  // sets the network where the new contract will be originated
  public setTargetNetwork(network: NetworkType, rpcUrl?: string): GeorgeCloney {
    this.networkTo = network;

    if (rpcUrl) {
      this.networkToUrl = rpcUrl;
    } else {
      this.networkToUrl = config.defaultRpcUrls[network];
    }

    this.TezosTo = new TezosToolkit(this.networkToUrl);

    return this;
  }

  // copies data from bigmap in source contract
  public copyBigMap(bigmapId: number) {}

  // originates a new contract
  public async clone(): Promise<string> {
    if (!this.networkFrom) throw "No source network";
    if (!this.networkTo) throw "No target network";
    if (!this.contractToOriginate) throw "No contract to originate";
    if (!this.TezosTo) throw "Tezos Toolkit missing for target network";

    let op;
    if (this.taquitoApi === "wallet") {
      op = await this.TezosTo.wallet
        .originate({
          code: this.contractToOriginate.code,
          storage: this.newStorage
        })
        .send();
    } else {
      op = await this.TezosTo.contract.originate({
        code: this.contractToOriginate.code,
        storage: this.newStorage
      });
    }
    const contract = await op.contract();

    return contract.address;
  }

  // clears data related to previously fetched contract
  public clear() {}

  // returns the currently saved storage for the new contract
  public getNewStorage() {
    return { storage: this.newStorage, type: this.newStorageType };
  }
}
