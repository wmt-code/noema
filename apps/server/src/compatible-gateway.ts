import { lookup } from 'node:dns'
import { isIP } from 'node:net'
import ipaddr from 'ipaddr.js'
import { Agent } from 'undici'
import { BadRequestException } from '@nestjs/common'

const globalIPv6 = ipaddr.IPv6.parse('2000::')

function publicAddress(address: string) {
  const ip = ipaddr.parse(address)
  return (
    ip.range() === 'unicast' &&
    (ip instanceof ipaddr.IPv4 || ip.match(globalIPv6, 3))
  )
}

export function compatibleBaseUrl(value: string): string {
  const url = URL.parse(value)
  if (
    url &&
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    !/[?#]/.test(url.href)
  ) {
    const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '')
    const validHost = isIP(host)
      ? publicAddress(host)
      : host.includes('.') &&
        !/(?:^|\.)(?:localhost|local|internal)$/.test(host)
    if (validHost && !/\/chat\/completions\/*$/i.test(url.pathname))
      return url.href.replace(/\/+$/, '')
  }
  throw new BadRequestException('Invalid compatible gateway Base URL')
}

// Check the IPs used by the socket itself to prevent DNS rebinding.
const dispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error, '', 0)
        if (
          !addresses.length ||
          addresses.some(({ address }) => !publicAddress(address))
        )
          return callback(new Error('Gateway must use a public address'), '', 0)
        if (options.all) return callback(null, addresses)
        callback(null, addresses[0].address, addresses[0].family)
      })
    }
  }
})

export const gatewayFetch: typeof fetch = (input, init) => {
  const options = { ...init, dispatcher, redirect: 'error' as const }
  return fetch(input, options)
}
