'use strict'
const _ = require('lodash');
const FlexContract = require('flex-contract');
const FlexEther = require('flex-ether');
const BigNumber = require('bignumber.js');
const ethjs = require('ethereumjs-util');
const ethwallet = require('ethereumjs-wallet');
const ethjshdwallet = require('ethereumjs-wallet/hdkey');
const bip39 = require('bip39');
const ERC20_ABI = require('./erc20.abi.json');

module.exports = {
	sendTokens: sendTokens,
	getWallet: getWallet
};

async function getWallet(opts, eth=null) {
	eth = eth || new FlexEther(opts);
	let from = null;
	let key = null;
	if (opts.from)
		from = opts.from
	else if (opts.mnemonic || opts.key || opts.keystore) {
		key = getPrivateKey(opts);
		if (key)
			from = keyToAddress(key);
	} else
		from = await eth.getDefaultAccount();
	return {
		address: from,
		key: key
	};
}

async function sendTokens(token, to, amount, opts={}) {
	const contract = new FlexContract(ERC20_ABI, token, {
			provider: opts.provider,
			providerURI: opts.providerURI,
			network: opts.network,
			infuraKey: opts.infuraKey,
			web3: opts.web3,
			net: require('net')
		});
	const wallet = await getWallet(opts, contract._eth);
	if (!wallet.address)
		throw new Error('No account to send from.');
	await verifyTokenBalance(contract, wallet.address, amount);
	return {tx: contract.transfer(to, amount, {
		from: wallet.key ? undefined : wallet.address,
		key: wallet.key
	})};
}

async function verifyTokenBalance(contract, from, amount) {
	const balance = await contract.balanceOf(from);
	if (new BigNumber(balance).lt(amount))
		throw new Error('Insufficient balance.');
}

function keyToAddress(key) {
	return ethjs.toChecksumAddress(ethjs.bufferToHex(
		ethjs.privateToAddress(ethjs.toBuffer(key))));
}

function getPrivateKey(opts) {
	if (opts.key)
		return opts.key;
	if (opts.keystore)
		return fromKeystore(opts.keystore, opts.password);
	if (opts.mnemonic)
		return fromMnemonic(opts.mnemonic, opts.mnemonicIndex || 0);
}

function fromKeystore(keystore, pw) {
	if (!pw)
		throw new Error('Keystore requires password.');
	if (_.isObject(keystore))
		keystore = JSON.stringify(keystore);
	const wallet = ethwallet.fromV3(keystore, pw, true);
	return ethjs.bufferToHex(wallet.getPrivateKey());
}

function fromMnemonic(mnemonic, idx=0) {
	const seed = bip39.mnemonicToSeed(mnemonic.trim());
	const path = `m/44'/60'/0'/0/${idx}`;
	const node = ethjshdwallet.fromMasterSeed(seed).derivePath(path);
	const wallet = node.getWallet();
	return ethjs.bufferToHex(wallet.getPrivateKey());
}
