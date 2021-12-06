import GeorgeCloney from "../cloney/GeorgeCloney";
import config from "../cloney/config";
import {
  NetworkType,
  TezosContractAddress,
  StorageType
} from "../cloney/types";
import { MichelsonMap, BigMapAbstraction } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import BigNumber from "bignumber.js";

describe("George Cloney Tests", () => {
  let georgeCloney: GeorgeCloney | undefined;
  const contracts: {
    [p in string]: {
      address: TezosContractAddress;
      valuesInStorage: string[];
      customStorage: any;
    };
  } = {
    PLENTY: {
      address: "KT1CA7QaXeciRJttSiWtPXdfYBsVFZBMK8Rj", //"KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b",
      valuesInStorage: [
        "administrator",
        "lastUpdate",
        "paused",
        "totalSupply",
        "tokensPerBlock"
      ],
      customStorage: {
        administrator: "tz1Me1MGhK7taay748h4gPnX2cXvbgL6xsYL",
        balances: new MichelsonMap(),
        lastUpdate: 12345,
        metadata: new MichelsonMap(),
        paused: false,
        token_metadata: new MichelsonMap(),
        tokensPerBlock: 20000000000000000000,
        totalSupply: 1000
      }
    }
  };
  const signerSk =
    "edskRpm2mUhvoUjHjXgMoDRxMKhtKfww1ixmWiHCWhHuMEEbGzdnz8Ks4vgarKDtxok7HmrEo1JzkXkdkvyw7Rtw6BNtSd7MJ7";

  jest.setTimeout(60000);

  test("Passes wrong values to set up George Cloney", () => {
    expect(
      () =>
        new GeorgeCloney({
          from: NetworkType.MAINNET,
          walletApi: true,
          signer: new InMemorySigner(signerSk)
        })
    ).toThrow("The signer doesn't match the selected API (wallet/contract)");

    expect(
      () =>
        new GeorgeCloney({
          from: "testnet" as any,
          walletApi: false,
          signer: new InMemorySigner(signerSk)
        })
    ).toThrow("Unknown network type");
  });

  test("Checks if George Cloney is set correctly", () => {
    const networkFrom = NetworkType.HANGZHOUNET;

    georgeCloney = new GeorgeCloney({
      from: networkFrom,
      walletApi: false,
      signer: new InMemorySigner(signerSk)
    });

    expect(georgeCloney.networkFrom).toEqual(networkFrom);
    expect(georgeCloney.signer).toBeInstanceOf(InMemorySigner);
    expect(georgeCloney.networkFromUrl).toEqual(
      config.defaultRpcUrls[networkFrom]
    );
  });

  test("Fetches contract to clone", async () => {
    expect(georgeCloney).toBeDefined();

    if (georgeCloney) {
      // FAILS
      expect(georgeCloney.contractToOriginate).toBeUndefined();

      // passing a non-existing contract address
      expect(
        async () => await (georgeCloney as GeorgeCloney).fetch("test" as any)
      ).rejects.toThrow("Fetch: Invalid contract address");
      // fetching a contract that doesn't exist on mainnet
      expect(
        async () =>
          await (georgeCloney as GeorgeCloney).fetch(
            "KT1HW2kH3RHzVnoH7DxrCPUhFqbTeFYdKjds"
          )
      ).rejects.toThrow("Not Found");

      // SUCCESS
      expect(georgeCloney.contractToOriginate).toBeUndefined();
      georgeCloney = await georgeCloney.fetch(contracts.PLENTY.address);

      expect(georgeCloney.contractToOriginate).toBeDefined();
      expect(georgeCloney.contractToOriginate).toHaveProperty("address");
      expect(georgeCloney.contractToOriginate?.address).toEqual(
        contracts.PLENTY.address
      );
      expect(Array.isArray(georgeCloney.contractToOriginate?.code)).toBe(true);
      expect(georgeCloney.contractToOriginate?.code).toHaveLength(3);
    }
  });

  test("Creates the storage for the new contract", async () => {
    expect(georgeCloney).toBeDefined();

    if (georgeCloney) {
      // tests for the Plenty contract
      const originalStorageValues: any = {};
      contracts.PLENTY.valuesInStorage.forEach(
        val =>
          (originalStorageValues[val] = BigNumber.isBigNumber(
            georgeCloney?.contractToOriginate?.storage[val]
          )
            ? georgeCloney?.contractToOriginate?.storage[val].toNumber()
            : georgeCloney?.contractToOriginate?.storage[val])
      );
      // Empty storage
      georgeCloney = georgeCloney.addStorage(StorageType.EMPTY);
      const newEmptyStorage = georgeCloney.getNewStorage();
      expect(newEmptyStorage.type).toEqual(StorageType.EMPTY);
      Object.values(newEmptyStorage.storage).forEach(val => {
        if (val instanceof MichelsonMap) {
          expect((val as any).size).toEqual(0);
        } else {
          expect(!!val).toBeFalsy();
        }
      });
      // Current storage
      georgeCloney = georgeCloney.addStorage(StorageType.CURRENT);
      const newCurrentStorage = georgeCloney.getNewStorage();
      expect(newCurrentStorage.type).toEqual(StorageType.CURRENT);
      Object.entries(newCurrentStorage.storage).forEach(([key, val]) => {
        // ignoring map/bigmap values
        if (BigNumber.isBigNumber(val)) {
          expect(val.toNumber()).toEqual(originalStorageValues[key]);
        } else if (!(val instanceof MichelsonMap)) {
          expect(val).toEqual(originalStorageValues[key]);
        }
      });
      // Custom storage
      georgeCloney = georgeCloney.addStorage(
        StorageType.CUSTOM,
        contracts.PLENTY.customStorage
      );
      const newCustomStorage = georgeCloney.getNewStorage();
      Object.entries(originalStorageValues).forEach(([key, _]) => {
        expect(newCustomStorage.storage).toHaveProperty(key);
      });
    }
  });

  test("Copies contract bigmaps", async () => {
    expect(georgeCloney).toBeDefined();

    if (georgeCloney) {
      const bigmapIds = georgeCloney.getBigmapsIds();
      await georgeCloney.copyBigMap([bigmapIds[0][1]]);
    }
  });

  test("Sets the target network for the new contract", () => {
    expect(georgeCloney).toBeDefined();

    if (georgeCloney) {
      expect(georgeCloney.networkTo).toBeUndefined();
      expect(georgeCloney.networkToUrl).toBeUndefined();

      // sets network but not RPC URL
      georgeCloney = georgeCloney.setTargetNetwork(NetworkType.GRANADANET);
      expect(georgeCloney.networkTo).toEqual(NetworkType.GRANADANET);
      expect(georgeCloney.networkToUrl).toEqual(
        config.defaultRpcUrls[NetworkType.GRANADANET]
      );

      // sets network and RPC URL
      const rpcUrl = "http://localhost:20000"; // local flextesa instance
      georgeCloney = georgeCloney.setTargetNetwork(
        NetworkType.HANGZHOUNET,
        rpcUrl
      );
      expect(georgeCloney.networkTo).toEqual(NetworkType.HANGZHOUNET);
      expect(georgeCloney.networkToUrl).toEqual(rpcUrl);
    }
  });

  test("Originates the cloned contract", async () => {
    expect(georgeCloney).toBeDefined();

    if (georgeCloney && georgeCloney.contractToOriginate) {
      const { address, contract } = await georgeCloney.clone();
      console.log("Contract address:", address);
      expect(address).toBeDefined();
      expect(contract).toBeDefined();
      // checks if the storage of the new contract matches the one in George Cloney
      const cloneyStorage: any = georgeCloney.getNewStorage();
      const originatedStorage: any = await contract.storage();
      Object.entries(originatedStorage).forEach(([key, val]) => {
        // ignoring map/bigmap values
        if (BigNumber.isBigNumber(val)) {
          expect(val.toNumber()).toEqual(cloneyStorage.storage[key]);
        } else if (
          !(val instanceof MichelsonMap) &&
          !(val instanceof BigMapAbstraction)
        ) {
          expect(val).toEqual(cloneyStorage.storage[key]);
        }
      });
      // checks if balance bigmap was copied properly
      const originalBalance =
        await georgeCloney.contractToOriginate.storage.balances.get(
          "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb"
        );
      const newStorage: any = await contract.storage();
      const newBalance = await newStorage.balances.get(
        "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb"
      );
      //console.log(originalBalance);
      expect(originalBalance).toBeDefined();
      // checks same balance
      expect(newBalance).toBeDefined();
      expect(originalBalance.balance.toNumber()).toEqual(
        newBalance.balance.toNumber()
      );
      // checks entries in approval maps
      const originalApprovals: { address: string; amount: number }[] = [];
      const newApprovals: { address: string; amount: number }[] = [];
      const originalEntries = originalBalance.approvals.entries();
      for (let entry of originalEntries) {
        originalApprovals.push({
          address: entry[0],
          amount: entry[1].toNumber()
        });
      }
      const newEntries = newBalance.approvals.entries();
      for (let entry of newEntries) {
        newApprovals.push({
          address: entry[0],
          amount: entry[1].toNumber()
        });
      }
      //console.log(originalApprovals, newApprovals);
      originalApprovals.forEach(approval => {
        expect(
          newApprovals.filter(
            appr =>
              appr.address === approval.address &&
              appr.amount === approval.amount
          )
        ).toBeTruthy();
      });
    }
  });
});
