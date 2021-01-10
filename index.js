const CabalBot = require('cabal-bot-core')
const Discord = require('discord.js')
const chalk = require('chalk')

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
  log(2, `recieved msg event from discord: [author:${msg.author.username}:${msg.author.id}] [channel:#${msg.channel.name}] [msg:${msg.content}]`)
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

    const attachments = msg.attachments.reduce((attachmentString, attachment) => {
      return attachmentString + `[${attachment.name}](${attachment.url}) `
    }, '')

    cabalChannelsToForwardTo.forEach(channel => {
      log(1, chalk.gray(`[frm:#${msg.channel.name}] [to:#${channel}] [usr:${msg.author.username}] `) + `${msg.content}`)
    })

    cabalBot.broadcast(cabalChannelsToForwardTo, `_${msg.author.username}@discord_: ${attachments}${msg.content}`)
  }
}

function processMessageFromCabal(envelope, hooks) {
  log(2, `recieved msg event from cabal: [author:${envelope.author.name}:${envelope.author.key}] [channel:#${envelope.channel}] [msg:${envelope.message.value.content.text}]`)
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
      log(0, chalk.gray(`[frm:#${envelope.channel}] [to:#${webhook.channelName}] [usr:${envelope.author.name || '?'}] `) + `${envelope.message.value.content.text}`)

      webhook.send(envelope.message.value.content.text, {
        username: `${envelope.author.name || '?'}@cabal`
      })
    }
  })
}

function getTimestampPretty () {
  const current = new Date()
  const hours = current.getHours().toString().padStart(2, '0')
  const minutes = current.getMinutes().toString().padStart(2, '0')
  const seconds = current.getSeconds().toString().padStart(2, '0')

  const month = (current.getMonth() + 1).toString().padStart(2, '0')
  const date = current.getDate().toString().padStart(2, '0')
  return `${date}/${month} ${hours}:${minutes}:${seconds}`
}

function log (type, message) {
  if (config.logging) {
    switch (type) {
      case 0: // from cabal
        console.log(`(${getTimestampPretty()}) ` + chalk.bold.blueBright('[cabal->discord] ') + message)
        break
      case 1: // from discord
        console.log(`(${getTimestampPretty()}) ` + chalk.bold.greenBright('[discord->cabal] ') + message)
        break
      case 2:
        if (config.logging === 'debug') {
          console.log(`(${getTimestampPretty()}) ` + chalk.gray(message))
        }
    }
  }
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
