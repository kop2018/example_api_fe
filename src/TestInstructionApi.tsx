import {
  getMEEVersion,
  MEEVersion,
  toMultichainNexusAccount,
} from "@biconomy/abstractjs";
import {
  usePrivy,
  useSign7702Authorization,
  useSignMessage,
  useSignTypedData,
  useWallets,
} from "@privy-io/react-auth";
import {
  encodeAbiParameters,
  encodeFunctionData,
  http,
  parseUnits,
  type Abi,
  type Address,
} from "viem";
import { base, sei } from "viem/chains";
import { REWARD_DISTRIBUTION_ABI } from "./reward_distribution";
import {
  buildIntentInstruction,
  testBuild,
  testPrepare,
  testGetQuoteApi,
  testExecute,
  prepareAndBuild,
} from "./services/biconomy";
import type { BiconomySmartAccountV2 } from "@biconomy/account";
export const REWARD_DISTRIBUTION_ADDRESS =
  "0xe79f1C4b116E16429fFa1e1884A55083bE03466C";

export const meeVersion = MEEVersion.V2_1_0;
export const meeVersionConfig = getMEEVersion(meeVersion);

const deployNexusOnChain = async (
  V2AccountAddress: Address,
  ownerAddress: Address,
) => {
  const updateImplementationCalldata = encodeFunctionData({
    abi: [
      {
        name: "updateImplementation",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ type: "address", name: "newImplementation" }],
        outputs: [],
      },
    ],
    functionName: "updateImplementation",
    args: [meeVersionConfig.implementationAddress as `0x${string}`],
  });

  const updateImplementationTransaction = {
    to: V2AccountAddress,
    data: updateImplementationCalldata,
  };

  const initData = encodeFunctionData({
    abi: [
      {
        name: "initNexusWithDefaultValidator",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ type: "bytes", name: "data" }],
        outputs: [],
      },
    ],
    functionName: "initNexusWithDefaultValidator",
    args: [ownerAddress as `0x${string}`],
  });

  const initDataWithBootstrap = encodeAbiParameters(
    [
      { name: "bootstrap", type: "address" },
      { name: "initData", type: "bytes" },
    ],
    [meeVersionConfig.bootStrapAddress as Address, initData],
  );

  const initializeNexusCalldata = encodeFunctionData({
    abi: [
      {
        name: "initializeAccount",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ type: "bytes", name: "data" }],
        outputs: [],
      },
    ],
    functionName: "initializeAccount",
    args: [initDataWithBootstrap],
  });

  const initializeNexusTransaction = {
    to: V2AccountAddress,
    data: initializeNexusCalldata,
  };
  // const migrateToNexusResponse = await V2Account.sendTransaction(
  //   [updateImplementationTransaction, initializeNexusTransaction],
  //   {
  //     paymasterServiceData: { mode: PaymasterMode.SPONSORED },
  //   },
  // );

  // const hash = await migrateToNexusResponse.waitForTxHash();
  // console.log("Transaction hash:", hash);

  return { updateImplementationTransaction, initializeNexusTransaction };
};

export default function TestInstructionApi() {
  const { login } = usePrivy();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { signTypedData } = useSignTypedData();
  const { signMessage } = useSignMessage();
  const handleTest = async () => {
    const wallet = wallets.find(
      (wallet) => wallet.walletClientType === "privy",
    );

    if (!wallet) {
      throw new Error("No wallet connected");
    }
    await wallet.switchChain(base.id);
    const authorization = await signAuthorization({
      contractAddress: getMEEVersion(MEEVersion.V2_1_0).implementationAddress,
      chainId: base.id,
    });
    console.log(
      "getMEEVersion(MEEVersion.V2_1_0).implementationAddress:",
      getMEEVersion(MEEVersion.V2_1_0).implementationAddress,
    );
    console.log("Authorization:", authorization);
    console.log("Wallet address:", wallet.address);

    const proofs = [
      {
        epoch: 6,
        amount: 0.001,
        merkleProof: [
          "0xa86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457",
        ],
        token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      },
    ];

    const orchestrator = await toMultichainNexusAccount({
      chainConfigurations: [
        {
          chain: sei,
          transport: http(),
          version: getMEEVersion(MEEVersion.V2_1_0),
        },
        {
          chain: base,
          transport: http(),
          version: getMEEVersion(MEEVersion.V2_1_0),
        },
      ],
      signer: await wallet.getEthereumProvider(),
    });

    const address = await orchestrator.addressOn(base.id);
    console.log("Orchestrator address on Base:", address);
    console.log("Orchestrator address on Base:", orchestrator);

    const encodedCalls = proofs.map((proof) => {
      const decimals = 6;

      return encodeFunctionData({
        abi: REWARD_DISTRIBUTION_ABI,
        functionName: "claim",
        args: [
          BigInt(proof.epoch),
          parseUnits(proof.amount.toString(), decimals),
          proof.merkleProof as `0x${string}`[],
        ],
      });
    });

    const instruction = await orchestrator?.buildComposable({
      type: "default",
      data: {
        chainId: base.id,
        to: REWARD_DISTRIBUTION_ADDRESS as `0x${string}`,
        abi: REWARD_DISTRIBUTION_ABI as Abi,
        functionName: "multicall",
        args: [encodedCalls],
      },
    });

    const buildData = await testBuild(encodedCalls);
    console.log("buildData:", buildData);
    if (!buildData || buildData.instructions.length === 0) {
      throw new Error("No instruction built");
    }
    console.log(
      "Instruction:",
      JSON.stringify(instruction, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );

    const auth = await testPrepare(
      JSON.stringify(instruction, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );
    console.log("Auth:", auth);

    let authorizationAfter: any = [];

    if (auth.length !== 0) {
      authorizationAfter = await signAuthorization({
        ...auth[0],
      });
    }

    const quote = await testGetQuoteApi(
      JSON.stringify(authorizationAfter, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
      JSON.stringify(buildData.instructions, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );

    console.log("Quote:", quote);

    const signatures = await Promise.all(
      quote.payloadToSign.map(async (payload: any) => {
        if (quote.quoteType === "permit") {
          // EIP-712 permit signature
          return await signTypedData(payload.signablePayload);
        } else if (quote.quoteType === "simple") {
          // Simple message signature
          console.log("payload.message.raw:", payload.message.raw);
          return await signMessage({ message: payload.message.raw as string });
        }
      }),
    );

    const dataBody = {
      ...quote,
      payloadToSign: quote.payloadToSign.map((payload: any, index: number) => ({
        ...payload,
        signature: signatures[index].signature,
      })),
    };
    console.log("Data to be sent:", dataBody);
    const hash = await testExecute(dataBody);
    console.log("Transaction hash:", hash);
  };

  const prepareAndBuildClick = async () => {
    const response = await prepareAndBuild();
    console.log("Prepare and Build response:", response);

    const quote = await testGetQuoteApi(
      JSON.stringify(response.prepareResult, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
      JSON.stringify(
        // Pass as individual instruction objects, not wrapped in array
        [
          response.instructions.initializeAccount.instructions,
          response.instructions.updateImplementation.instructions,
        ].flat(), // Use flat() to ensure single level array
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      ),
    );

    console.log("Quote:", quote);
  };
  return (
    <div className="flex flex-col gap-4">
      Test Api
      <button onClick={() => login()}>Log wallets</button>
      <button onClick={handleTest}>Test</button>
      <button onClick={prepareAndBuildClick}>Test build struction</button>
    </div>
  );
}
