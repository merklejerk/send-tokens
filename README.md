[![build status](https://travis-ci.org/merklejerk/send-tokens.svg?branch=master)](https://travis-ci.org/merklejerk/send-tokens)
[![npm package](https://badge.fury.io/js/send-tokens.svg)](https://www.npmjs.com/package/send-tokens)

# send-tokens
A simple CLI tool (and library) for sending Ethereum ERC20 tokens using any of the following:

- A wallet's private key
- A keystore file
- An HD wallet mnemonic phrase
- A provider (node) wallet address

For the ether version of this package, check out
[send-ether](https://github.com/merklejerk/send-ether).


### Migrating from 1.x:
Token amounts are now in **whole** units, by default, which is defined by the number
of decimal places a token contract supports. This means sending `100.123` tokens
with a token that supports 18 decimal places, will actually send
`100.123 * 10^18` of the smallest unit of that token. This behavior can be
overridden with the `--decimals` option.

### Contents

- [Installation](#installation)
- [Examples](#examples)
- [All Options](#all-options)
- [JSON Logs](#json-logs)
- [ENS Names](#ens-names)
- [Library Usage](#library-usage)

## Installation
```bash
npm install -g send-tokens
# or
yarn global add send-tokens
```

## Examples
```bash
# Address of token contract. May also be an ENS name.
TOKEN='0x1658164265555FA310d20bC601Dd32e9b996A436'
# Recipient of tokens. May also be an ENS name.
DST='0x0420DC92A955e3e139b52142f32Bd54C6D46c023'
# Sending wallet's private key.
PRIVATE_KEY='0x52c251b9e04740157471a724e9a3210b83fac5834b29c89d5bd57661bd2a7057'
# Sending wallet's HD mnemonic.
MNEMONIC='butter crepes sugar flour eggs milk ...'

# Send 100.53 WHOLE tokens to an address,
# on the mainnet, using a wallet's private key
$ send-tokens --key $PRIVATE_KEY $TOKEN $DST 100.53

# Send 32 of the smallest units of a token to an address, on ropsten,
# using an HD wallet mnemonic
$ send-tokens --network ropsten --mnemonic "$MNEMONIC" $TOKEN $DST 32 -d 0

# Send 99 WHOLE tokens to an address, on the mainnet,
# using a keystore file.
$ send-tokens --keystore './path/to/keystore.json' --password 'secret' $TOKEN $DST 99

# Send 64.3163512 WHOLE tokens to an address, on the provider's network,
# using the provider's default wallet, and wait for 3 confirmations.
$ send-tokens --provider 'http://localhost:8545' --confirmations 3 $TOKEN $DST 64.3163512
```

## All Options
```
$ send-tokens --help
Usage: send-tokens [options] <token> <to> <amount>

Options:

  -v, --version               output the version number
  -d, --decimals <n>          decimal places amount is expressed in (default: max token supports)
  -k, --key <hex>             sending wallet's private key
  -f, --key-file <file>       sending wallet's private key file
  -s, --keystore-file <file>  sending wallet's keystore file
  --password <password        keystore file password
  -m, --mnemonic <phrase>     sending wallet's HD wallet phrase
  --mnemonic-index <n>        sending wallet's HD wallet account index (default: 0)
  -a, --account <hex>         sending wallet's account address (provider wallet)
  -c, --confirmations <n>     number of confirmations to wait for before returning (default: 0)
  -p, --provider <uri>        provider URI
  -n, --network <name>        network name
  -G, --gas-price <gwei>      explicit gas price, in gwei (e.g., 20)
  -l, --log <file>            append a JSON log to a file
  --no-confirm                bypass confirmation
  -h, --help                  output usage information

```

## JSON Logs
If you pass the `--log` option, a JSON object describing the transfer
will be appended to a file when the transaction is mined, one object per line.

##### Log Entries
Log entries follow this structure:
```js
{
   // Unique transfer ID to identify related logs.
   id: '88fdd8a4b8084c36',
   // UNIX time.
   time: 1532471209842,
   // Address of token contract.
   token: '0x1658164265555FA310d20bC601Dd32e9b996A436',
   // Address of sender.
   from: '0x0420DC92A955e3e139b52142f32Bd54C6D46c023',
   // Address of recipient.
   to: '0x2621Ea417659Ad69BAE66AF05eBE5788e533E5e8',
   // Amount of tokens sent (in weis).
   amount: '20',
   // Transaction ID of transfer.
   txId: '0xd9255f8365305ebffd77cb30d09f82745eaa232e42739f5fc2788fa46f1347e3',
   // Block number where the transfer was mined.
   block: 4912040,
   // Gas used.
   gas: 40120
}
```

## ENS Names
Anywhere you can pass an address, you can also pass an ENS name, like
`'ethereum.eth'`, and the it will automatically be resolved to a real
address.

ENS resolution only works on the mainnet, rinkeby, and ropsten, and the name
must be fully registered with the ENS contract and a resolver.


## Library Usage
The `send-tokens` package can be used as a library through the `sendTokens()`
function.

`sendTokens()` asynchronously resolves to a
[transaction receipt](https://web3js.readthedocs.io/en/1.0/web3-eth.html#eth-gettransactionreceipt-return)
once the transaction has been mined (or confirmed, if the
`confirmations` option is > 0).

#### sendTokens() Examples

```js
const {sendTokens} = require('send-tokens');
// Address of token contract.
const TOKEN_ADDRESS = '0x1658164265555FA310d20bC601Dd32e9b996A436';
// Recipient of tokens.
const RECIPIENT = '0x0420DC92A955e3e139b52142f32Bd54C6D46c023';

// Sending wallet's private key.
const PRIVATE_KEY = '0x52c251b9e04740157471a724e9a3210b83fac5834b29c89d5bd57661bd2a7057';
// Send 100 WHOLE tokens of tokens to someone using a private key and wait for
// it to be mined.
let receipt = await sendTokens(TOKEN_ADDRESS, RECIPIENT, '100',
  {key: PRIVATE_KEY});

// Sending wallet's mnemonic.
const MNEMONIC = 'butter crepes sugar flour eggs milk ...';
// Send 100.312 WHOLE tokens to someone using a (BIP39) mnemonic phrase
// and wait for it to be mined and confirmed 3 times.
receipt = await sendTokens(TOKEN_ADDRESS, RECIPIENT, '100.312',
  {mnemonic: MNEMONIC, confirmations: 3});

// Sending wallet's keystore file contents as a string.
const KEYSTORE = '{...}';
// Keystore password.
const PASSWORD = 'secret';
// Send 32 of the smallest unit of tokens to someone using a keystore file,
// print the transaction ID when it's available, and wait for it to be mined.
receipt = await sendTokens(TOKEN_ADDRESS, RECIPIENT, '32', {
    keystore: KEYSTORE,
    password: PASSWORD,
    decimals: 0,
    onTxId: console.log
  });
```

#### Full sendTokens() Options

```js
const {sendTokens} = require('send-tokens');
// Send TOKEN_AMOUNT tokens to RECIPIENT via the token contract at
// TOKEN_ADDRESS.
{tx: Object} = async sendTokens(
  // Address of token contract.
  // Should be a hex string ('0x...')
  TOKEN_ADDRESS: String,
  // Address of recipient.
  // Should be a hex string ('0x...')
  RECIPIENT: String,
  // Amount of tokens to send. Units depend on `decimals` option.
  // Should be a base-10 decimal string (e.g., '1234.56').
  TOKEN_AMOUNT: String,
  // Options object
  {
    // Suppress output.
    quiet: Boolean,
    // If specified, append to a JSON log file at this path.
    log: String,
    // Call this function, passing the transaction hash/ID of the transaction
    // once it becomes available (transaction is posted to the blockchain but
    // not yet mined).
    onTxId: Function,
    // Decimal places of token amount.
    // E.g., 18 for 18 decimal places, 0 for smallest units.
    // Defaults to maximum decimal places supported by token contract.
    decimals: Number,
    // If connecting to a custom provider (e.g., a private node), this
    // can be the set to the address of an unlocked wallet on the provider
    // from which to send the tokens.
    account: String,
    // Hex-encoded 32-byte private key of sender (e.g., '0x1234...').
    key: String,
    // BIP39 mnemonic phrase of sender.
    mnemonic: String,
    // Sender's Mnemonic account index. Defaults to 0.
    mnemonicIndex: Number,
    // Sender's JSON-encoded keystore file contents.
    keystore: String,
    // Sender's keystore file path.
    keystoreFile: String,
    // Keystore password.
    password: String,
    // Ethereum network to use. May be 'main', 'ropsten', 'rinkeby', or 'kovan'.
    // Defaults to 'main',
    network: String,
    // Gas price for the transaction.
    // Should be a number in gweis.
    // Defaults to current network gas price.
    gasPrice: Number,
    // Number of confirmations to wait for after the transaction is mined.
    // Maximum of 12. Defaults to 0 (no confirmations).
    confirmations: Number,
    // Infura API key to use.
    infuraKey: String,
    // Custom provider. May either be a URI (e.g., http://localhost:8545) or
    // a Provider object from Web3.
    provider: String | Object,
    // Custom web3 object.
    web3: Object
  });
```

#### toWallet()
Another exposed library function is `toWallet()`, which returns an address
& private key pair from a private key, mnemonic, or keystore. Below are the
full options.

```js
const {toWallet} = require('send-tokens');
// Convert a private key, mnemonic, or keystore to an address and private-key
// pair object. Both fields will be a hex-encoded string.
{address: String, key: String} = toWallet({
    // Hex-encoded 32-byte private key of sender (e.g., '0x1234...').
    key: String,
    // BIP39 mnemonic phrase.
    mnemonic: String,
    // Mnemonic account index. Defaults to 0.
    mnemonicIndex: Number,
    // JSON-encoded keystore file contents.
    keystore: String,
    // Keystore password (if `keystore` is passed).
    password: String
  });
```
