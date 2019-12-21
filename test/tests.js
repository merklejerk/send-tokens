'use strict'
const _ = require('lodash');
const FlexContract = require('flex-contract');
const FlexEther = require('flex-ether');
const ABI = require('./contracts/token.json');
const BigNumber = require('bignumber.js');
const STARTING_TOKENS = new BigNumber('1e18').times(1e6).toString(10);
const STARTING_ETHER = new BigNumber('1e18').times(1e6).toString(10);
const lib = require('../');
const ethjs = require('ethereumjs-util');
const ethjshdwallet = require('ethereumjs-wallet/hdkey');
const ethwallet = require('ethereumjs-wallet');
const bip39 = require('bip39');
const crypto = require('crypto');
const ganache = require('ganache-cli');
const assert = require('assert');

describe('send-tokens', function() {
	let _ganache = null;
	let provider = null;
	let accounts = null;
	let token = null;

	before(async function() {
		accounts = _.times(16, () => randomAccount());
		provider = ganache.provider({
			accounts: _.map(accounts, acct => ({
				secretKey: acct.key,
				balance: STARTING_ETHER
			}))
		});
		// Suppress max listener warnings.
		provider.setMaxListeners(4096);
		provider.engine.setMaxListeners(4096);
	});

	beforeEach(async function() {
		token = new FlexContract(ABI, {provider: provider});
		await token.new();
		await token.mint(accounts[0].address, STARTING_TOKENS);
	});

	it('fails if insufficient balance', async function() {
		const amount = _.random(1, 10, true);
		const to = randomAccount();
		await assert.rejects(lib.sendTokens(token.address, to.address, amount,
				{from: accounts[1].address, provider: provider, quiet: true}));
	});

	it('can transfer tokens via default account', async function() {
		const amount = _.random(1, 10, true);
		const to = randomAccount();
		const receipt = await lib.sendTokens(token.address, to.address, amount,
			{provider: provider, quiet: true});
		assert.ok(receipt.transactionHash);
		assert.equal(await token.balanceOf(to.address), toWei(amount));
	});

	it('can transfer tokens via private key', async function() {
		const amount = _.random(1, 10, true);
		const to = randomAccount();
		const receipt = await lib.sendTokens(token.address, to.address, amount,
			{key: accounts[0].key, provider: provider, quiet: true});
		assert.ok(receipt.transactionHash);
		assert.equal(await token.balanceOf(to.address), toWei(amount));
	});

	it('can transfer tokens via keystore', async function() {
		const amount = _.random(1, 10, true);
		const to = randomAccount();
		const PW = crypto.randomBytes(8).toString('hex');
		const keystore = createKeystore(accounts[0], PW);
		const receipt = await lib.sendTokens(token.address, to.address, amount,
			{keystore: keystore, password: PW, provider: provider, quiet: true});
		assert.ok(receipt.transactionHash);
		assert.equal(await token.balanceOf(to.address), toWei(amount));
	});

	it('can transfer tokens via mnemonic', async function() {
		const amount = _.random(1, 10, true);
		const mnemonic = 'shantay you stay';
		const to = randomAccount();
		const from = fromMnemonic(mnemonic);
		await fundAccount(from.address, token);
		const receipt = await lib.sendTokens(token.address, to.address, amount,
			{mnemonic: mnemonic, provider: provider, quiet: true});
		assert.ok(receipt.transactionHash);
		assert.equal(await token.balanceOf(to.address), toWei(amount));
	});

	it('can transfer tokens via with different units', async function() {
		const to = randomAccount();
		const receipt = await lib.sendTokens(token.address, to.address, 1,
			{provider: provider, decimals: 9, quiet: true});
		assert.ok(receipt.transactionHash);
		assert.equal(await token.balanceOf(to.address),
			_.toString(new BigNumber('1e9').toString(10)));
	});
});

function toWei(amount, base=18) {
	return new BigNumber(amount).times(`1e${base}`).toString(10);
}

function randomAccount() {
	const key = crypto.randomBytes(32);
	const address = ethjs.toChecksumAddress(
		ethjs.bufferToHex(ethjs.privateToAddress(key)));
	return {
		key: ethjs.bufferToHex(key),
		address: address
	};
}

function createKeystore(acct, pw) {
	const wallet = ethwallet.fromPrivateKey(ethjs.toBuffer(acct.key));
	return wallet.toV3(pw);
}

function fromMnemonic(mnemonic, idx=0) {
	const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
	const path = `m/44'/60'/0'/0/${idx}`;
	const node = ethjshdwallet.fromMasterSeed(seed).derivePath(path);
	const wallet = node.getWallet();
	return {
		address: wallet.getChecksumAddressString(),
		key: ethjs.bufferToHex(wallet.getPrivateKey())
	};
}

async function fundAccount(address, token) {
	await token.eth.transfer(address, new BigNumber('1e18').toString(10));
	await token.mint(address, STARTING_TOKENS);
}
