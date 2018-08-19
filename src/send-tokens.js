#!/usr/bin/env node
'use strict'
const _ = require('lodash');
const process = require('process');
const program = require('commander');
const BigNumber = require('bignumber.js');
const ethjs = require('ethereumjs-util');
const fs = require('mz/fs');
const VERSION = require('../package.json').version;
const lib = require('./lib');
require('colors');

if (require.main == module) {
	process.on('unhandledRejection', console.error);
	program
		.version(VERSION, '-v, --version')
		.arguments('<token> <to> <amount>')
		.option('-b, --base <n>', `decimal places amount is expressed in (e.g, 0 for wei, 18 for ether)`, parseInt, 0)
		.option('-k, --key <hex>', `sending wallet's private key`)
		.option('-f, --key-file <file>', `sending wallet's private key file`)
		.option('-s, --keystore <file> <password>', `sending wallet's keystore file`)
		.option('-m, --mnemonic <phrase>', `sending wallet's HD wallet phrase`)
		.option('--mnemonic-index <n>', `sending wallet's HD wallet account index`, parseInt, 0)
		.option('-a, --account <hex>', `sending wallet's account address (provider wallet)`)
		.option('-c, --confirmations <n>', `number of confirmations to wait for before returning`, parseInt, 0)
		.option('-p, --provider <uri>', `provider URI`)
		.option('-n, --network <name>', 'network name')
		.option('-G, --gas-price <gwei>', `explicit gas price, in gwei (e.g., 20)`, parseFloat)
		.option('-l, --log <file>', `append a JSON log to a file`)
		.action(async function (token, to, amount) {
			try {
				await run(opts, {token: token, to: to, amount: amount});
				process.exit(0);
			} catch (err) {
				console.error(err.message);
				process.exit(-1);
			}
		});
	program.parse(process.argv);
	if (process.argv.slice(2).length == 0)
		program.outputHelp();
}

async function run(opts, args) {
	for (let addr of [args.token, args.to]) {
		if (!/^(\w+\.)*\w+\.(test|eth)$/.test(addr) && !ethjs.isValidAddress(addr))
			throw new Error(`Invalid address: ${addr}`);
	}
	if (!/^\d+(\.\d+)?$/.test(args.amount))
		throw new Error(`Invalid amount: ${args.amount}`);

	const token = ethjs.isValidAddress(args.to) ? ethjs.toChecksumAddress(args.token) : args.token;
	const to = ethjs.isValidAddress(args.to) ? ethjs.toChecksumAddress(args.to) : args.to;
	const amount = toWei(args.amount, opts.base || 0);
	const confirmations = opts.confirmations || 0;
	const opts = await createTransferOpts(opts);
	const wallet = await lib.toWallet(opts);
	const logId = createLogId({
		time: _.now(),
		token: token,
		to: to,
		amount: amount,
		from: wallet.address
	});
	const log = opts.log ? createJSONLogger(logId, opts.log) : _.noop;

	console.log(`Token: ${token.green.bold}`);
	console.log(`${wallet.address.blue.bold} -> ${amount.yellow.bold} -> ${to.blue.bold}`);

	const {tx} = await lib.sendTokens(token, to, amount, opts);
	const txId = await tx.txId;

	console.log(`Waiting for transaction ${txId.green.bold} to be mined...`);

	const receipt = await tx.confirmed(confirmations);

	log({
		from: wallet.address,
		amount: amount,
		token: token,
		to: to,
		txId: txId,
		gas: receipt.gasUsed,
		block: receipt.blockNumber,
	});
};

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
	else if (opts.keystore) {
		txOpts.keystore = await fs.readFile(opts.keystore, 'utf-8');
		txOpts.password = opts.password;
	}
	else if (opts.mnemonic) {
		txOpts.mnemonicIndex = opts.mnemonicIndex || 0;
		txOpts.mnemonic = opts.mnemonic.trim();
	} else if (opts.account)
		txOpts.from = opts.account;

	if (opts.provider)
		txOpts.providerURI = opts.provider;
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

module.exports = {run: run};
