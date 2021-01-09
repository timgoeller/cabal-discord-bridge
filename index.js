const CabalBot = require('cabal-bot-core')
const Discord = require('discord.js')

const fs = require('fs')
let config = {}
try {
  config = JSON.parse(fs.readFileSync('config.json'))
} catch {
  throw new Error('Error while parsing config, make sure config.js exists')
}

const discordBot = new Discord.Client()

if (!config.name) {
  config.name = 'discord-bridge'
}

const cabalOpts = {
  clientOpts: {
    config: {
      temp: true
    }
  }
}

const WEBHOOK_NAME = 'Discord-Cabal-Bridge'
const cabalBot = new CabalBot(config.name, cabalOpts)

cabalBot.joinCabal(config.cabalKey)
discordBot.login(config.discordSecret)

//* doesn't fully work yet, won't send messages from channel x to all channels yet

discordBot.on('ready', async () => {
  if (!discordBot.guilds.cache.every((guild) => {
    return guild.me.hasPermission(['MANAGE_WEBHOOKS'])
  })) {
    throw new Error('Bot needs MANAGE_WEBHOOKS permission!')
  }

  const hooks = new WebhookController()
  hooks.getOrCreateWebhooks(discordBot)
  discordBot.on('message', msg => processMessageFromDiscord(msg, hooks))
  cabalBot.on('new-message', (envelope) => processMessageFromCabal(envelope, hooks))
})

function processMessageFromDiscord (msg, hooks) {
  if (discordBot.user.id !== msg.author.id && !hooks.sentByBot(msg)) {
    const cabalChannelsToForwardTo = new Set()
    config.mappings.forEach(mapping => {
      if (mapping.from === 'discord' || mapping.from === 'both') {
        if (mapping.discord.includes('*') || mapping.discord.includes(msg.channel.name)) {
          mapping.cabal.forEach(cabalMapping =>
            cabalChannelsToForwardTo.add(cabalMapping)
          )
        }
      }
    })
    cabalBot.broadcast(cabalChannelsToForwardTo, `(${msg.author.username}@discord): ${msg.content}`)
  }
}

function processMessageFromCabal (envelope, hooks) {
  const discordChannelsToForwardTo = new Set()
  config.mappings.forEach(mapping => {
    if (mapping.from === 'cabal' || mapping.from === 'both') {
      if (mapping.cabal.includes('*') || mapping.cabal.includes(envelope.channel)) {
        mapping.discord.forEach(discordMapping => discordChannelsToForwardTo.add(discordMapping))
      }
    }
  })

  hooks.webhooks.forEach((webhook) => {
    if (discordChannelsToForwardTo.has(webhook.channelName)) {
      webhook.send(envelope.message.value.content.text, {
        username: envelope.author.name + '@cabal'
      })
    }
  })
}

class WebhookController {
  async getOrCreateWebhooks (client) {
    const webhookPromises = []
    client.channels.cache.forEach(channel => {
      if (channel.type === 'text') {
        webhookPromises.push(async () => {
          const hooks = await channel.fetchWebhooks()
          let hook = hooks.find(h => h.name === WEBHOOK_NAME)
          if (!hook) {
            hook = await channel.createWebhook(WEBHOOK_NAME)
          }
          hook.channelName = channel.name
          return hook
        })
      }
    })
    this.webhooks = await Promise.all(webhookPromises.map(fn => fn()))
  }

  sentByBot (msg) {
    return this.webhooks.some(hook => hook.id === msg.author.id)
  }
}
