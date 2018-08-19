![build status](https://travis-ci.org/cluracan/send-tokens.svg?branch=master)
![npm package](https://badge.fury.io/js/send-tokens.svg)

# send-tokens
A simple CLI tool for sending Ethereum ERC20 tokens using any of the following:

- A wallet's private key
- A keystore file
- An HD wallet mnemonic phrase
- A provider (node) wallet address

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

# Send 100 wei (100e-18) of tokens to and address,
# on the mainnet, using a wallet's private key
$ send-tokens --key $PRIVATE_KEY $TOKEN $DST 100

# Send 100 wei (100e-18) of tokens to an address, on ropsten,
# using an HD wallet mnemonic
$ send-tokens --network ropsten --mnemonic "$MNEMONIC" $TOKEN $DST 100

# Send 100 wei (100e-18) of tokens to an address, on the mainnet,
# using a keystore file.
$ send-tokens --keystore './path/to/keystore.json' --password 'secret' $TOKEN $DST 100

# Send 100 wei (100e-18) of tokens to an address, on the provider's network,
# using the provider's default wallet, and wait for 3 confirmations.
$ send-tokens --provider 'http://localhost:8545' --confirmations 3 $TOKEN $DST 100
```

## All Options
```
$ send-tokens --help
Usage: send-tokens [options] <token> <to> <amount>

  Options:

    -v, --version                     output the version number
    -b, --base <n>                    decimal places amount is expressed in (e.g, 0 for wei, 18 for ether) (default: 0)
    -k, --key <hex>                   sending wallet's private key
    -f, --key-file <file>             sending wallet's private key file
    -s, --keystore <file> <password>  sending wallet's keystore file
    -m, --mnemonic <phrase>           sending wallet's HD wallet phrase
    --mnemonic-index <n>              sending wallet's HD wallet account index (default: 0)
    -a, --account <hex>               sending wallet's account address (provider wallet)
    -c, --confirmations <n>           number of confirmations to wait for before returning (default: 0)
    -p, --provider <uri>              provider URI
    -n, --network <name>              network name
    -G, --gas-price <gwei>            explicit gas price, in gwei (e.g., 20)
    -l, --log                         append a JSON resuly object to a log file on success
    -h, --help                        output usage information
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
The `send-tokens` package can be used (as a slightly lower-level) library through
the `sendTokens()` function. As a library, input normalization and logging are
the responsibility of the caller. Token amounts should be expressed as either
hex-encoded (`0x...`) or base-10 **strings** to avoid precision errors.

`sendTokens()` asynchronously resolves to a an object with a `tx` field, which
is a transaction promise-object from the [flex-contract](https://github.com/cluracan/flex-contract#transaction-promises)
library for the transfer. This extra layer of indirection is necessary to
prevent implicit promise chaining with `await`.

#### sendTokens() Examples

```js
const {sendTokens} = require('send-tokens');
// Address of token contract.
const TOKEN_ADDRESS = '0x1658164265555FA310d20bC601Dd32e9b996A436';
// Recipient of tokens.
const RECIPIENT = '0x0420DC92A955e3e139b52142f32Bd54C6D46c023';

// Sending wallet's private key.
const PRIVATE_KEY = '0x52c251b9e04740157471a724e9a3210b83fac5834b29c89d5bd57661bd2a7057';
// Try to send 100 wei (1e-18) of tokens to someone using a private key.
const {tx} = await sendTokens(TOKEN_ADDRESS, RECIPIENT, '100',
  {key: PRIVATE_KEY});
// Wait for 3 confirmations after the transaction is mined and get the receipt.
let receipt = await tx.confirmed(3);

// Sending wallet's mnemonic.
const MNEMONIC = 'butter crepes sugar flour eggs milk ...';
// Try to send 100 wei (1e-18) of tokens to someone using a (BIP39) mnemonic phrase.
{tx} = await sendTokens(TOKEN_ADDRESS, RECIPIENT, '100',
  {mnemonic: MNEMONIC});
// Just wait for the transaction hash.
let txId = await tx.txId(3);

// Sending wallet's keystore file contents as a string.
const KEYSTORE = '{...}';
// Keystore password.
const PASSWORD = 'secret';
// Try to send 100 wei (1e-18) of tokens to someone using a keystore file.
{tx} = await sendTokens(TOKEN_ADDRESS, RECIPIENT, '100',
  {keystore: KEYSTORE, password: PASSWORD});
// Wait for the transaction to be mined and get the receipt.
receipt = await tx.receipt;
```

#### Full sendTokens() Options

```js
const {sendTokens} = require('send-tokens');
// Send AMOUNT_IN_WEI tokens to RECIPIENT via the token contract at
// TOKEN_ADDRESS.
{tx: Object} = async sendTokens(
  // Address of token contract.
  TOKEN_ADDRESS: String,
  // Address of recipient.
  RECIPIENT: String,
  // Amount of tokens to send, in wei (1e-18).
  // Should be either a hex-encoded or base-10 string.
  AMOUNT_IN_WEI: String,
  // Options object
  {
    // If connecting to a custom provider (e.g., a private node), this
    // can be the set to the address of an unlocked wallet on the provider
    // from which to send the tokens.
    from: String,
    // Hex-encoded 32-byte private key of sender (e.g., '0x1234...').
    key: String,
    // BIP39 mnemonic phrase.
    mnemonic: String,
    // JSON-encoded keystore file contents.
    keystore: String,
    // Keystore password (if `keystore` is passed).
    password: String,
    // Ethereum network to use. May be 'main', 'ropsten', 'rinkeby', or 'kovan'.
    // Defaults to 'main',
    network: String,
    // Infura API key to use.
    infuraKey: String,
    // Custom provider URI (e.g., http://localhost:8545)
    providerURI: String,
    // Custom provider object.
    provider: Object,
    // Custom web3 object.
    web3: Object
  });
```

#### toWallet()
Another exposed library function is `toWallet()`, which returns an address
and private key pair from a private key, mnemonic, or keystore. Below are the
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
    // JSON-encoded keystore file contents.
    keystore: String,
    // Keystore password (if `keystore` is passed).
    password: String
  });
```
