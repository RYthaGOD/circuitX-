require('dotenv').config();
const starknet = require('starknet');

const RPC_URL = 'https://ztarknet-madara.d.karnot.xyz';
const ROLE_STORE_ADDRESS = '0x005cd9ac7159f8b1c7e4e7994effe29c2e42305f26cfbe948c51826082b16819';
const POSITION_HANDLER_ADDRESS = '0x002304423ec3e6dc51a553552373abf70a2d41ae5207eef86c69053e18418e04';
const ZTARKNET_ADDRESS = '0xaf0ec7edf5cfe4b63e230b9ec808956c41de0a54dcc9b0b808054230fcdfec';
const ZTARKNET_PRIVATE_KEY = '0x20a81d20d27d7e546aaa18474607fd3e00eeb28169d1f92f6984d768b374a7';

const ROLE_STORE_ABI = [
    {
        type: 'function',
        name: 'has_role',
        inputs: [
            { name: 'account', type: 'felt252' },
            { name: 'role', type: 'felt252' }
        ],
        outputs: [{ name: 'has_role', type: 'bool' }],
        state_mutability: 'view',
    },
    {
        type: 'function',
        name: 'grant_role',
        inputs: [
            { name: 'account', type: 'felt252' },
            { name: 'role', type: 'felt252' }
        ],
        outputs: [],
        state_mutability: 'external',
    },
];

const provider = new starknet.RpcProvider({ nodeUrl: RPC_URL });

function stringToFelt252(str) {
    return starknet.cairo.felt(str);
}

async function grantPositionHandlerRole() {
    console.log('🔐 Granting POSITION_HANDLER role to PositionHandler\n');
    console.log(`   PositionHandler: ${POSITION_HANDLER_ADDRESS}`);
    console.log(`   RoleStore: ${ROLE_STORE_ADDRESS}\n`);
    
    // Create ztarknet account
    const ztarknetAccount = new starknet.Account({
        provider,
        address: ZTARKNET_ADDRESS,
        signer: ZTARKNET_PRIVATE_KEY,
        cairoVersion: '1',
        transactionVersion: '0x3',
    });
    
    // Check if PositionHandler already has the role
    console.log('🔍 Checking if PositionHandler already has POSITION_HANDLER role...');
    const contract = new starknet.Contract({
        abi: ROLE_STORE_ABI,
        address: ROLE_STORE_ADDRESS,
        providerOrAccount: provider,
    });
    
    try {
        const hasRole = await contract.has_role(POSITION_HANDLER_ADDRESS, stringToFelt252('POSITION_HANDLER'));
        if (hasRole) {
            console.log('   ✅ PositionHandler already has POSITION_HANDLER role\n');
            return;
        }
        console.log('   ❌ PositionHandler does NOT have POSITION_HANDLER role\n');
    } catch (error) {
        console.error('❌ Error checking role:', error.message);
        process.exit(1);
    }
    
    // Verify ztarknet has ADMIN role
    console.log('🔍 Verifying ztarknet account has ADMIN role...');
    try {
        const hasAdminRole = await contract.has_role(ZTARKNET_ADDRESS, stringToFelt252('ADMIN'));
        if (!hasAdminRole) {
            console.error('❌ ztarknet account does not have ADMIN role');
            console.error('   Cannot grant roles without ADMIN role');
            process.exit(1);
        }
        console.log('   ✅ ztarknet has ADMIN role\n');
    } catch (error) {
        console.error('❌ Error checking admin role:', error.message);
        process.exit(1);
    }
    
    // Grant role
    console.log('📤 Granting POSITION_HANDLER role to PositionHandler...');
    try {
        const contractWithAccount = new starknet.Contract({
            abi: ROLE_STORE_ABI,
            address: ROLE_STORE_ADDRESS,
            providerOrAccount: ztarknetAccount,
        });
        
        const tx = await contractWithAccount.grant_role(
            POSITION_HANDLER_ADDRESS,
            stringToFelt252('POSITION_HANDLER')
        );
        
        console.log('✅ Transaction submitted!');
        console.log(`   Transaction hash: ${tx.transaction_hash}`);
        console.log('   Waiting for confirmation...\n');
        
        await provider.waitForTransaction(tx.transaction_hash);
        
        console.log('✅ POSITION_HANDLER role granted successfully!\n');
        console.log('📋 PositionHandler can now call lock_collateral and unlock_collateral');
        
    } catch (error) {
        console.error('❌ Error granting role:', error.message);
        if (error.message.includes('NOT_ADMIN')) {
            console.error('   The ztarknet account does not have ADMIN role.');
        }
        process.exit(1);
    }
}

grantPositionHandlerRole().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});









