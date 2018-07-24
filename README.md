![build status](https://travis-ci.org/cluracan/send-tokens.svg?branch=master)
![npm package](https://badge.fury.io/js/send-tokens.svg)

# send-tokens
A simple CLI tool for sending Ethereum ERC20 tokens using any of the following:

- A wallet's private key
- A keystore file
- An HD wallet mnemonic phrase
- A provider (node) wallet address

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
    -j, --json                        json output
    -h, --help                        output usage information
```

## JSON Output
`send-tokens` can output JSON stdout for programmatic log parsing with the
`--json` option. You can then pipe this output to another executable or to a
log file.

##### Example
```bash
$ send-tokens --json --key $PRIVATE_KEY $TOKEN $DST
# Output:
   { from: '0x0420DC92A955e3e139b52142f32Bd54C6D46c023',
     amount: '20',
     token: '0x1658164265555FA310d20bC601Dd32e9b996A436',
     to: '0x2621Ea417659Ad69BAE66AF05eBE5788e533E5e8',
     txId:
      '0xd9255f8365305ebffd77cb30d09f82745eaa232e42739f5fc2788fa46f1347e3',
     state: 'pending',
     time: 1532471209842,
     id: '88fdd8a4b8084c36' }
   { from: '0x0420DC92A955e3e139b52142f32Bd54C6D46c023',
     amount: '20',
     token: '0x1658164265555FA310d20bC601Dd32e9b996A436',
     to: '0x2621Ea417659Ad69BAE66AF05eBE5788e533E5e8',
     txId:
      '0xd9255f8365305ebffd77cb30d09f82745eaa232e42739f5fc2788fa46f1347e3',
     gas: 36566,
     state: 'mined',
     time: 1532471219246,
     id: '88fdd8a4b8084c36' }
```

## ENS Names
Anywhere you can pass an address, you can also pass an ENS name, like
`'ethereum.eth'`, and the it will automatically be resolved to a real
address.

ENS resolution only works on the mainnet, rinkeby, and ropsten, and the name
must be fully registered with the ENS contract and a resolver.
