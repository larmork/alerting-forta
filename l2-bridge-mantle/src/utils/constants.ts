import BigNumber from 'bignumber.js'

type ProxyContract = {
  name: string
  address: string
}

export type MANTLE_L2ERC20_TOKEN_BRIDGED_TYPE = ProxyContract
export type MANTLE_WSTETH_BRIDGED_TYPE = ProxyContract
export type RoleHashToName = Map<string, string>

export const ETH_DECIMALS = new BigNumber(10).pow(18)

export type Address = {
  L1_WSTETH_ADDRESS: string
  MANTLE_L1ERC20_TOKEN_BRIDGE_ADDRESS: string
  MANTLE_GOV_EXECUTOR_ADDRESS: string
  MANTLE_L2ERC20_TOKEN_BRIDGE_ADDRESS: string
  MANTLE_WSTETH_ADDRESS: string
  MANTLE_L2ERC20_TOKEN_BRIDGED: MANTLE_L2ERC20_TOKEN_BRIDGED_TYPE
  MANTLE_WSTETH_BRIDGED: MANTLE_WSTETH_BRIDGED_TYPE
  RolesMap: RoleHashToName
}

const L1_WSTETH_ADDRESS = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'
const MANTLE_GOV_EXECUTOR_ADDRESS: string = '0x3a7b055bf88cdc59d20d0245809c6e6b3c5819dd'
const MANTLE_L1ERC20_TOKEN_BRIDGE_ADDRESS: string = '0x2d001d79e5af5f65a939781fe228b267a8ed468b'
const MANTLE_L2ERC20_TOKEN_BRIDGE_ADDRESS: string = '0x9c46560d6209743968cc24150893631a39afde4d'
const MANTLE_WSTETH_ADDRESS: string = '0x458ed78eb972a369799fb278c0243b25e5242a83'

const DEPOSITS_DISABLER_ROLE_HASH: string = '0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6'
const DEPOSITS_ENABLER_ROLE_HASH: string = '0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a'
const WITHDRAWALS_ENABLER_ROLE_HASH: string = '0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d'
const WITHDRAWALS_DISABLER_ROLE_HASH: string = '0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c'
const DEFAULT_ADMIN_ROLE_HASH: string = '0x0000000000000000000000000000000000000000000000000000000000000000'

export const Address: Address = {
  L1_WSTETH_ADDRESS: L1_WSTETH_ADDRESS,
  MANTLE_L1ERC20_TOKEN_BRIDGE_ADDRESS: MANTLE_L1ERC20_TOKEN_BRIDGE_ADDRESS,
  MANTLE_GOV_EXECUTOR_ADDRESS: MANTLE_GOV_EXECUTOR_ADDRESS,
  MANTLE_L2ERC20_TOKEN_BRIDGE_ADDRESS: MANTLE_L2ERC20_TOKEN_BRIDGE_ADDRESS,
  MANTLE_WSTETH_ADDRESS: MANTLE_WSTETH_ADDRESS,
  MANTLE_L2ERC20_TOKEN_BRIDGED: {
    name: 'MANTLE_L2ERC20_TOKEN_BRIDGE_ADDRESS',
    address: MANTLE_L2ERC20_TOKEN_BRIDGE_ADDRESS,
  },
  MANTLE_WSTETH_BRIDGED: {
    name: 'MANTLE_WSTETH_ADDRESS',
    address: MANTLE_WSTETH_ADDRESS,
  },
  RolesMap: new Map<string, string>([
    [DEPOSITS_ENABLER_ROLE_HASH, 'DEPOSITS ENABLER ROLE'],
    [DEPOSITS_DISABLER_ROLE_HASH, 'DEPOSITS DISABLER ROLE'],
    [WITHDRAWALS_ENABLER_ROLE_HASH, 'WITHDRAWALS ENABLER ROLE'],
    [WITHDRAWALS_DISABLER_ROLE_HASH, 'WITHDRAWALS DISABLER ROLE'],
    [DEFAULT_ADMIN_ROLE_HASH, 'DEFAULT ADMIN ROLE'],
  ]),
}
