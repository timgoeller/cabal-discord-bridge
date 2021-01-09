var CabalBot = require('cabal-bot-core')
const Discord = require('discord.js')

const fs = require('fs')

try {
  var config = JSON.parse(fs.readFileSync('config.json'))
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

const cabalBot = new CabalBot(config.name, cabalOpts)

cabalBot.joinCabal(config.cabalKey)
discordBot.login(config.discordSecret)

//* doesn't fully work yet, won't send messages from channel x to all channels yet

discordBot.on('ready', () => {
  discordBot.on('message', msg => processMessageFromDiscord(msg))
})

cabalBot.on('new-message', (envelope) => processMessageFromCabal(envelope))

function processMessageFromDiscord(msg) {
  if(discordBot.user.id !== msg.author.id) {
    const cabalChannelsToForwardTo = new Set()
    config.mappings.forEach(mapping => {
      if (mapping.from === 'discord' || mapping.from === 'both') {
        if (mapping.discord.includes('*') || mapping.discord.includes(msg.channel.name)) {
          mapping.cabal.forEach(cabalMapping => cabalChannelsToForwardTo.add(cabalMapping))
        }
      }
    })
    cabalBot.broadcast(cabalChannelsToForwardTo, msg.content)
  }
}

function processMessageFromCabal(envelope) {
  const discordChannelsToForwardTo = new Set()
  config.mappings.forEach(mapping => {
    if (mapping.from === 'cabal' || mapping.from === 'both') {
      if (mapping.cabal.includes('*') || mapping.cabal.includes(envelope.channel)) {
        mapping.discord.forEach(discordMapping => discordChannelsToForwardTo.add(discordMapping))
      }
    }
  })

  discordBot.channels.cache.forEach(discordChannel => {
    if (discordChannelsToForwardTo.has(discordChannel.name)) {
      discordChannel.send(envelope.message.value.content.text)
    }
  })
}