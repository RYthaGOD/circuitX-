import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import IDL from "./idl.json"; // Need to copy this later

export const PROGRAM_ID = new PublicKey("zkNRFg6rNJGMqkAYxW1o5sdDSfxqskL1PDbJ4VZ4Zmk");

export const getProgram = (connection: Connection, wallet: any) => {
    const provider = new AnchorProvider(connection, wallet, {});
    setProvider(provider);
    setProvider(provider);
    // @ts-ignore
    return new Program(IDL as Idl, PROGRAM_ID, provider);
};

export const findUserVault = (user: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("user_vault"), user.toBuffer()],
        PROGRAM_ID
    );
};
