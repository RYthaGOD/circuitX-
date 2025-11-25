URL=https://ztarknet-madara.d.karnot.xyz
ACCOUNT_NAME=ztarknet
ACCOUNT_CLASS_HASH=0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189
FEE_TOKEN_ADDRESS=0x1ad102b4c4b3e40a51b6fb8a446275d600555bd63a95cdceed3e5cef8a6bc1d

account-create:
	sncast account create \
		--class-hash $(ACCOUNT_CLASS_HASH) \
		--type oz \
		--url $(URL) \
		--name $(ACCOUNT_NAME)

account-topup:
	cd admin && TOPUP_ADDRESS=$$(sncast account list | grep -A 10 "$(ACCOUNT_NAME)" | grep "address:" | awk '{print $$2}') npm run topup

account-deploy:
	sncast account deploy \
		--url $(URL) \
		--name $(ACCOUNT_NAME)

account-balance:
	sncast balance \
		--token-address $(FEE_TOKEN_ADDRESS) \
		--url $(URL)

## Install dependencies

install-noir:
	curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
	noirup --version 1.0.0-beta.5

install-barretenberg:
	curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/master/barretenberg/bbup/install | bash
	bbup --version 0.87.4-starknet.1

## Copy artifacts to app folder

artifacts:
	cp ./circuit/target/circuit.json ./app/src/assets/circuit.json
	cp ./circuit/target/vk ./app/src/assets/vk.bin
	cp ./verifier/target/release/verifier_UltraStarknetZKHonkVerifier.contract_class.json ./app/src/assets/verifier.json