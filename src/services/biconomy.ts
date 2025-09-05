import axios from "axios";
import { REWARD_DISTRIBUTION_ABI } from "../reward_distribution";
import { encodeFunctionData, parseUnits } from "viem";

export const getQuote = async () => {};

export const buildIntentInstruction = async () => {
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

  const dataBuild = {
    type: "/instructions/build",
    data: {
      functionSignature: "function multicall(bytes[] data)",
      args: [encodedCalls],
      to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      chainId: 8453,
      value: "0",
      gasLimit: "500000",
    },
  };

  console.log("dataBuild: ", dataBuild);

  // Call backend endpoint instead of Biconomy API directly to avoid CORS
  const { data } = await axios.post(
    "http://localhost:4001/compose",
    { ...dataBuild },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  console.log("data: ", data);

  return data;
};

export const testGetQuote = async () => {
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

  const dataBuild = {
    type: "/instructions/build",
    data: {
      functionSignature: "function multicall(bytes[] data)",
      args: [encodedCalls],
      to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      chainId: 8453,
      value: "0",
      gasLimit: "500000",
    },
  };
  const response = await fetch("https://api.biconomy.io/v1/mee/quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "eoa-7702",
      fromAddress: "0x0a7C906832544293a6018bA25280c7f7b0Bbf120",
      instructions: [
        [
          {
            calls: [
              {
                to: "0xe79f1C4b116E16429fFa1e1884A55083bE03466C",
                value: "0",
                functionSig: "0xac9650d8",
                inputParams: [
                  {
                    fetcherType: 0,
                    constraints: [],
                    paramData:
                      "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a4ae0b51df000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e645700000000000000000000000000000000000000000000000000000000",
                  },
                ],
                outputParams: [],
              },
            ],
            chainId: 8453,
            isComposable: true,
          },
        ],
      ],
      feeToken: {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        chainId: 1,
      },
    }),
  });

  const data = await response.json();
  console.log(data);
};

export const testPrepare = async (auth, intruct) => {
  const { data } = await axios.post("http://localhost:4001/", {
    authorization: auth,
    instructions: intruct,
  });

  return data;
};

export const testGetQuoteApi = async (auth, intruct) => {
  const { data } = await axios.post("http://localhost:4001/quote", {
    authorization: auth,
    instructions: intruct,
  });

  return data;
};

export const testBuild = async (args) => {
  const { data } = await axios.post("http://localhost:4001/build", {
    args,
  });
  return data;
};
