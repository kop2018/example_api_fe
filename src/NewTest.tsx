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
export default function NewTest() {
  const { login } = usePrivy();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();

  const handleTest = async () => {
    const intentResponse = await fetch(
      "https://api.biconomy.io/v1/instructions/intent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "YOUR_API_KEY",
        },
        body: JSON.stringify({
          slippage: 0.003,
          ownerAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          inputPositions: [
            {
              chainToken: {
                chainId: 10, // Optimism
                tokenAddress: "0x625E7708f30cA75bfd92586e17077590C60eb4cD", // aUSDC
              },
              amount: "1000000000", // 1000 USDC
            },
          ],
          targetPositions: [
            {
              chainToken: {
                chainId: 8453, // Base
                tokenAddress: "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB", // aUSDC
              },
              weight: 1.0, // 100% allocation
            },
          ],
        }),
      },
    );

    const { instructions } = await intentResponse.json();
    console.log("Intent Instructions:", instructions);
  };
  return (
    <div className="flex flex-col gap-4">
      New Test instructions FE
      <button onClick={() => login()}>Log wallets</button>
      <button onClick={handleTest}>Test</button>
      <button onClick={buildIntentInstruction}>Test build struction</button>
    </div>
  );
}
