import { createConfig } from "@privy-io/wagmi";
import { base, sei } from "viem/chains";
import { http } from "wagmi";

export const wagmiConfig = createConfig({
  chains: [sei, base],
  transports: {
    [sei.id]: http(),
    [base.id]: http(),
  },
});
