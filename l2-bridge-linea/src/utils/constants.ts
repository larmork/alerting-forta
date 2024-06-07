import BigNumber from 'bignumber.js'

const LINEA_BRIDGE_EXECUTOR = '0x74be82f00cc867614803ffd7f36a2a4af0405670'
const LINEA_L2_TOKEN_BRIDGE = '0x353012dc4a9a6cf55c941badc267f82004a8ceb9'
const ADMIN_OF_LINEA_L2_TOKEN_BRIDGE = '0x1e1f6f22f97b4a7522d8b62e983953639239774e'
const LINEA_WST_CUSTOM_BRIDGED_TOKEN = '0xB5beDd42000b71FddE22D3eE8a79Bd49A568fC8F'
const LINEA_PROXY_ADMIN_FOR_WSTETH = '0xF951d7592e03eDB0Bab3D533935e678Ce64Eb927'
const LINEA_L1_TOKEN_BRIDGE = '0x051f1d88f0af5763fb888ec4378b4d8b29ea3319'
const WSTETH_ADDRESS = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'

export const ETH_DECIMALS = new BigNumber(10).pow(18)

export type ProxyContract = {
  name: string
  hash: string
}

export type Address = {
  WSTETH_ADDRESS: string
  LINEA_BRIDGE_EXECUTOR: string
  LINEA_L1_TOKEN_BRIDGE: string
  LINEA_L2_TOKEN_BRIDGE: string
  ADMIN_OF_LINEA_L2_TOKEN_BRIDGE: string
  LINEA_WST_CUSTOM_BRIDGED_TOKEN: string
  LINEA_PROXY_ADMIN_FOR_WSTETH: string
  LINEA_L2_ERC20_TOKEN_BRIDGE: ProxyContract
  LINEA_WST_CUSTOM_BRIDGED: ProxyContract
}

export const Address: Address = {
  WSTETH_ADDRESS: WSTETH_ADDRESS,
  LINEA_BRIDGE_EXECUTOR: LINEA_BRIDGE_EXECUTOR,
  LINEA_L1_TOKEN_BRIDGE: LINEA_L1_TOKEN_BRIDGE,
  LINEA_L2_TOKEN_BRIDGE: LINEA_L2_TOKEN_BRIDGE,
  ADMIN_OF_LINEA_L2_TOKEN_BRIDGE: ADMIN_OF_LINEA_L2_TOKEN_BRIDGE,
  LINEA_WST_CUSTOM_BRIDGED_TOKEN: LINEA_WST_CUSTOM_BRIDGED_TOKEN,
  LINEA_PROXY_ADMIN_FOR_WSTETH: LINEA_PROXY_ADMIN_FOR_WSTETH,
  LINEA_L2_ERC20_TOKEN_BRIDGE: {
    name: 'L2_ERC20_TOKEN_BRIDGE',
    hash: LINEA_L2_TOKEN_BRIDGE,
  },
  LINEA_WST_CUSTOM_BRIDGED: {
    name: 'LINEA_WST_ETH_BRIDGED_ADDRESS',
    hash: LINEA_WST_CUSTOM_BRIDGED_TOKEN,
  },
}
