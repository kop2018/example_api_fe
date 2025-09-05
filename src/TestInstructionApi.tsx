import {
  createMeeClient,
  getMEEVersion,
  MEEVersion,
  toMultichainNexusAccount,
} from "@biconomy/abstractjs";
import {
  usePrivy,
  useSign7702Authorization,
  useWallets,
} from "@privy-io/react-auth";
import {
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
} from "./services/biconomy";
export const REWARD_DISTRIBUTION_ADDRESS =
  "0xe79f1C4b116E16429fFa1e1884A55083bE03466C";
export default function TestInstructionApi() {
  const { login } = usePrivy();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
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
        epoch: 3,
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
      JSON.stringify(authorization, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
      JSON.stringify(instruction, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );

    const authorizationAfter = await signAuthorization({
      ...auth[0],
    });

    await testGetQuoteApi(
      JSON.stringify(authorizationAfter, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
      JSON.stringify(buildData.instructions, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );
    // console.log(
    //   "Instruction:",
    //   JSON.stringify(instruction, (_key, value) =>
    //     typeof value === "bigint" ? value.toString() : value,
    //   ),
    // );
    // const quote = await meeClient.getQuote({
    //   sponsorship: true,
    //   instructions: instruction,
    //   // authorizations: [authorization],
    //   delegate: true,
    // });

    // const { hash } = await meeClient.executeQuote({ quote });
    // console.log("Transaction hash:", hash);
    // const receipt = await meeClient.waitForSupertransactionReceipt({
    //   hash,
    //   confirmations: 2, // optional
    // });
  };
  return (
    <div className="flex flex-col gap-4">
      Test Api
      <button onClick={() => login()}>Log wallets</button>
      <button onClick={handleTest}>Test</button>
      <button onClick={buildIntentInstruction}>Test build struction</button>
    </div>
  );
}
