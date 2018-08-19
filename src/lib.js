'use strict'
require('colors');
const _ = require('lodash');
const FlexContract = require('flex-contract');
const FlexEther = require('flex-ether');
const BigNumber = require('bignumber.js');
const ethjs = require('ethereumjs-util');
const ethwallet = require('ethereumjs-wallet');
const ethjshdwallet = require('ethereumjs-wallet/hdkey');
const bip39 = require('bip39');
const fs = require('mz/fs');
const ERC20_ABI = require('./erc20.abi.json');

module.exports = {
	sendTokens: sendTokens,
	toWallet: toWallet
};

function toWallet(opts) {
	let from = null;
	let key = null;
	if (opts.mnemonic || opts.key || opts.keystore) {
		key = getPrivateKey(opts);
		if (key)
			from = keyToAddress(key);
	}
	return {
		address: from,
		key: key
	};
}

async function sendTokens(token, to, amount, opts={}) {
	for (let addr of [token, to]) {
		if (!/^(\w+\.)*\w+\.(test|eth)$/.test(addr) && !ethjs.isValidAddress(addr))
			throw new Error(`Invalid address: ${addr}`);
	}
	if (!/^\d+(\.\d+)?$/.test(amount))
		throw new Error(`Invalid amount: ${amount}`);

	token = ethjs.isValidAddress(to) ? ethjs.toChecksumAddress(token) : token;
	to = ethjs.isValidAddress(to) ? ethjs.toChecksumAddress(to) : to;
	amount = toWei(amount, opts.base || 0);
	const confirmations = opts.confirmations || 0;
	const txOpts = await createTransferOpts(opts);
	const sender = await resolveSender(opts);
	const logId = createLogId({
		time: _.now(),
		token: token,
		to: to,
		amount: amount,
		from: sender
	});
	const writeLog = opts.log ? createJSONLogger(logId, opts.log) : _.noop;
	const say = opts.quiet ? _.noop : console.log;

	say(`Token: ${token.green.bold}`);
	say(`${sender.blue.bold} -> ${amount.yellow.bold} -> ${to.blue.bold}`);

	const {tx} = await transfer(token, to, amount, txOpts);
	const txId = await tx.txId;
	if (_.isFunction(opts.onTxId))
		opts.onTxId(txId);

	say(`Waiting for transaction ${txId.green.bold} to be mined...`);

	const receipt = await tx.confirmed(confirmations);

	writeLog({
		from: sender,
		amount: amount,
		token: token,
		to: to,
		txId: txId,
		gas: receipt.gasUsed,
		block: receipt.blockNumber,
	});
	return receipt;
}

async function resolveSender(opts) {
	const w = toWallet(opts);
	if (w && w.address)
		return w.address;
	const eth = new FlexEther({
		provider: _.isObject(opts.provider) ? opts.provider : undefined,
		providerURI: _.isString(opts.provider) ? opts.provider : undefined,
		web3: opts.web3,
		providerURI: opts.providerURI
	});
	return eth.getDefaultAccount();
}

function toWei(amount, base=0) {
	return new BigNumber(amount).times(`1e${base}`).integerValue().toString(10);
}

async function createTransferOpts(opts) {
	const txOpts = {};
	if (opts.key) {
		txOpts.key = ethjs.addHexPrefix(opts.key);
		if (!/^0x[a-f0-9]{64}$/i.test(txOpts.key))
			throw new Error('Invalid private key.');
	}
	else if (opts.keyFile)
		txOpts.key = await fs.readFile(opts.keyFile, 'utf-8');
	else if (opts.keystoreFile) {
		txOpts.keystore = await fs.readFile(opts.keystore, 'utf-8');
		txOpts.password = opts.password;
	}
	else if (opts.keystore) {
		txOpts.keystore = opts.keystore;
		txOpts.password = opts.password;
	}
	else if (opts.mnemonic) {
		txOpts.mnemonicIndex = opts.mnemonicIndex || 0;
		txOpts.mnemonic = opts.mnemonic.trim();
	} else if (opts.account)
		txOpts.from = opts.account;
	else if (opts.from)
		txOpts.from = opts.from;

	if (opts.provider) {
		if (_.isString(opts.provider))
			txOpts.providerURI = opts.provider;
		else
			txOpts.provider = opts.provider;
	}
	if (opts.network)
		txOpts.network = opts.network;

	if (opts.gasPrice) {
		txOpts.gasPrice = new BigNumber('1e9').times(opts.gasPrice)
			.integerValue().toString(10);
	}
	return txOpts;
}

function createLogId(fields) {
	const s = {
		time: fields.time,
		token: ethjs.toChecksumAddress(fields.token),
		to: ethjs.toChecksumAddress(fields.to),
		from: ethjs.toChecksumAddress(fields.from),
		amount: ethjs.bufferToHex(ethjs.toUnsigned(new ethjs.BN(fields.amount)))
	};
	return ethjs.bufferToHex(
		ethjs.keccak256(Buffer.from(JSON.stringify(s))).slice(0, 8)).slice(2);
}

function createJSONLogger(logId, file) {
	return (payload={}) => {
		const data = _.assign(payload,
			{time: Math.floor(_.now() / 1000), id: logId});
		const line = JSON.stringify(data);
		fs.appendFileSync(file, `${line}\n`);
	};
}

async function transfer(token, to, amount, opts={}) {
	const contract = new FlexContract(ERC20_ABI, token, {
			provider: opts.provider,
			providerURI: opts.providerURI,
			network: opts.network,
			infuraKey: opts.infuraKey,
			web3: opts.web3,
			net: require('net')
		});
	let from = undefined;
	let key = undefined;
	if (!opts.mnemonic && !opts.key && !opts.keystore) {
		if (opts.from)
			from = opts.from;
		else
			from = await contract._eth.getDefaultAccount();
	} else {
		const w = toWallet(opts, contract._eth);
		from = w.address;
		key = w.key;
	}
	if (!from)
		throw new Error('No account to send from.');
	await verifyTokenBalance(contract, from, amount);
	return {tx: contract.transfer(to, amount, {
		from: key ? undefined : from,
		key: key,
		gasPrice: opts.gasPrice
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
