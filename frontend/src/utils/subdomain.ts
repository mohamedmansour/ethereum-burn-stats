import { defaultNetwork, EthereumNetwork, EthereumNetworkOptions } from "../config"

function extractSubdomain(): [string, string] | undefined {
  const tokens = window.location.host.split('.')
  if (tokens.length === 3) {
    return [tokens[0], window.location.host.substr(tokens[0].length + 1)]
  }

  return undefined
}

export function navigateToSubdomain(subdomain: string) {
  let newDomain: string = ''
  const domainExtractor = extractSubdomain()
  if (domainExtractor) {
    const [subdomainParsed, domain] = domainExtractor
    if (subdomain === subdomainParsed) {
      return false // already navigated
    }

    // Network not found, navigate to subdomainless root.
    const network = Object.values(EthereumNetworkOptions).find(f => f.key === subdomainParsed)
    if (!network) {
      newDomain = domain
    } else {
      newDomain = `${subdomain}.${domain}`
    }
  } else {
    newDomain = `${subdomain}.${window.location.host}`
  }
  
  window.location.href = `${window.location.protocol}//${newDomain}`

  return true
}

export function getNetworkFromSubdomain(): EthereumNetwork | undefined {
  let network: EthereumNetwork | undefined
  const domainExtractor = extractSubdomain()
  if (domainExtractor) {
    const [subdomainParsed, domain] = domainExtractor
    network = Object.values(EthereumNetworkOptions).find(f => f.key === subdomainParsed)
    if (!network) {
      // Invalid Subdomain, go back to root host.
      const url = `${window.location.protocol}//${domain}`
      window.location.href = url
      return undefined
    }
  } else {
    network = defaultNetwork
  }

  return network
}
