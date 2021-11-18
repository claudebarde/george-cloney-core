import GeorgeCloney from "../cloney/GeorgeCloney";
import config from "../cloney/config";
import { NetworkType, TezosContractAddress } from "../cloney/types";
import { InMemorySigner } from "@taquito/signer";

describe("Set up", () => {
  let georgeCloney: GeorgeCloney | undefined;
  const contractAddress: {
    [p in string]: { address: TezosContractAddress; valuesInStorage: string[] };
  } = {
    PLENTY: {
      address: "KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b",
      valuesInStorage: ["administrator", "lastUpdate", "paused", "totalSupply"]
    }
  };
  const signerSk =
    "edskRpm2mUhvoUjHjXgMoDRxMKhtKfww1ixmWiHCWhHuMEEbGzdnz8Ks4vgarKDtxok7HmrEo1JzkXkdkvyw7Rtw6BNtSd7MJ7";

  jest.setTimeout(30000);

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
    const networkFrom = NetworkType.MAINNET;

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
      georgeCloney = await georgeCloney.fetch(contractAddress.PLENTY.address);

      expect(georgeCloney.contractToOriginate).toBeDefined();
      expect(georgeCloney.contractToOriginate).toHaveProperty("address");
      expect(georgeCloney.contractToOriginate?.address).toEqual(
        contractAddress.PLENTY.address
      );
      expect(Array.isArray(georgeCloney.contractToOriginate?.code)).toBe(true);
      expect(georgeCloney.contractToOriginate?.code).toHaveLength(3);
    }
  });

  test("Creates the storage for the new contract", async () => {
    expect(georgeCloney).toBeDefined();

    if (georgeCloney) {
      // Empty storage
      // Current storage
    }
  });
});
